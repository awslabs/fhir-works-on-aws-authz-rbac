/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { decode } from 'jsonwebtoken';
import {
    Authorization,
    AuthorizationRequest,
    AuthorizationBundleRequest,
    AllowedResourceTypesForOperationRequest,
    ReadResponseAuthorizedRequest,
    WriteRequestAuthorizedRequest,
    TypeOperation,
    SystemOperation,
    BatchReadWriteRequest,
    UnauthorizedError,
} from 'fhir-works-on-aws-interface';
import { Rule, RBACConfig } from './RBACConfig';

// eslint-disable-next-line import/prefer-default-export
export class RBACHandler implements Authorization {
    private readonly version: number = 1.0;

    private readonly rules: RBACConfig;

    constructor(rules: RBACConfig) {
        this.rules = rules;
        if (this.rules.version !== this.version) {
            throw Error('Configuration version does not match handler version');
        }
    }

    async isAuthorized(request: AuthorizationRequest) {
        const decoded = decode(request.accessToken, { json: true }) ?? {};
        const groups: string[] = decoded['cognito:groups'] ?? [];

        this.isAllowed(groups, request.operation, request.resourceType);
    }

    async isBundleRequestAuthorized(request: AuthorizationBundleRequest) {
        const decoded = decode(request.accessToken, { json: true }) ?? {};

        const groups: string[] = decoded['cognito:groups'] ?? [];

        const authZPromises: Promise<void>[] = request.requests.map(async (batch: BatchReadWriteRequest) => {
            return this.isAllowed(groups, batch.operation, batch.resourceType);
        });

        await Promise.all(authZPromises);
    }

    async getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]> {
        const { accessToken, operation } = request;
        const decoded = decode(accessToken, { json: true }) ?? {};
        const groups: string[] = decoded['cognito:groups'] ?? [];

        return groups.flatMap(group => {
            const groupRule = this.rules.groupRules[group];
            if (groupRule !== undefined && groupRule.operations.includes(operation)) {
                return groupRule.resources;
            }
            return [];
        });
    }

    // eslint-disable-next-line class-methods-use-this
    async authorizeAndFilterReadResponse(request: ReadResponseAuthorizedRequest): Promise<any> {
        // Currently no additional filtering/checking is needed for RBAC
        return request.readResponse;
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async isWriteRequestAuthorized(_request: WriteRequestAuthorizedRequest) {}

    private isAllowed(groups: string[], operation: TypeOperation | SystemOperation, resourceType?: string) {
        if (operation === 'read' && resourceType === 'metadata') {
            return; // capabilities statement
        }
        for (let index = 0; index < groups.length; index += 1) {
            const group: string = groups[index];
            if (this.rules.groupRules[group]) {
                const rule: Rule = this.rules.groupRules[group];
                if (
                    rule.operations.includes(operation) &&
                    ((resourceType && rule.resources.includes(resourceType)) || !resourceType)
                ) {
                    return;
                }
            }
        }
        throw new UnauthorizedError('Unauthorized');
    }
}
