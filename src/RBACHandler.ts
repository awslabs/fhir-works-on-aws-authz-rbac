/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { decode } from 'jsonwebtoken';
import {
    Authorization,
    AuthorizationRequest,
    AuthorizationBundleRequest,
    TypeOperation,
    SystemOperation,
    BatchReadWriteRequest,
    AllowedResourceTypesForOperationRequest,
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

    async isAuthorized(request: AuthorizationRequest): Promise<boolean> {
        const decoded = decode(request.accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        return this.isAllowed(groups, request.operation, request.resourceType);
    }

    async isBundleRequestAuthorized(request: AuthorizationBundleRequest): Promise<boolean> {
        const decoded = decode(request.accessToken, { json: true }) || {};

        const groups: string[] = decoded['cognito:groups'] || [];

        const authZPromises: Promise<boolean>[] = request.requests.map(async (batch: BatchReadWriteRequest) => {
            return this.isAllowed(groups, batch.operation, batch.resourceType);
        });
        const authZResponses: boolean[] = await Promise.all(authZPromises);
        return authZResponses.every(Boolean);
    }

    async getAllowedResourceTypesForOperation(request: AllowedResourceTypesForOperationRequest): Promise<string[]> {
        const { accessToken, operation } = request;
        const decoded = decode(accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        return groups.flatMap(group => {
            const groupRule = this.rules.groupRules[group];
            if (groupRule !== undefined && groupRule.operations.includes(operation)) {
                return groupRule.resources;
            }
            return [];
        });
    }

    private isAllowed(groups: string[], operation: TypeOperation | SystemOperation, resourceType?: string): boolean {
        if (operation === 'read' && resourceType === 'metadata') {
            return true; // capabilities statement
        }
        for (let index = 0; index < groups.length; index += 1) {
            const group: string = groups[index];
            if (this.rules.groupRules[group]) {
                const rule: Rule = this.rules.groupRules[group];
                if (
                    rule.operations.includes(operation) &&
                    ((resourceType && rule.resources.includes(resourceType)) || !resourceType)
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
