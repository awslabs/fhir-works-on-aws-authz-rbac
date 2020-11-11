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
    BASE_R4_RESOURCES,
    BASE_STU3_RESOURCES,
    FhirVersion,
    R4_PATIENT_COMPARTMENT_RESOURCES,
    STU3_PATIENT_COMPARTMENT_RESOURCES,
    BulkDataAuth,
    AccessBulkDataJobRequest,
} from 'fhir-works-on-aws-interface';

import isEqual from 'lodash/isEqual';

import { Rule, RBACConfig } from './RBACConfig';

// eslint-disable-next-line import/prefer-default-export
export class RBACHandler implements Authorization {
    private readonly version: number = 1.0;

    private readonly rules: RBACConfig;

    private readonly fhirVersion: FhirVersion;

    constructor(rules: RBACConfig, fhirVersion: FhirVersion) {
        this.rules = rules;
        if (this.rules.version !== this.version) {
            throw Error('Configuration version does not match handler version');
        }
        this.fhirVersion = fhirVersion;
    }

    async isAuthorized(request: AuthorizationRequest) {
        const decoded = decode(request.accessToken, { json: true }) ?? {};
        const groups: string[] = decoded['cognito:groups'] ?? [];

        if (request.bulkDataAuth) {
            this.isBulkDataAccessAllowed(groups, request.bulkDataAuth);
            return;
        }

        this.isAllowed(groups, request.operation, request.resourceType);
    }

    // eslint-disable-next-line class-methods-use-this
    isAccessBulkDataJobAllowed(request: AccessBulkDataJobRequest): void {
        if (request.requesterUserId !== request.jobOwnerId) {
            throw new UnauthorizedError('Unauthorized');
        }
    }

    private isBulkDataAccessAllowed(groups: string[], bulkDataAuth: BulkDataAuth): void {
        const { operation, exportType } = bulkDataAuth;
        if (['get-status-export', 'cancel-export', 'get-status-import', 'cancel-import'].includes(operation)) {
            return;
        }
        if (operation === 'initiate-export') {
            for (let index = 0; index < groups.length; index += 1) {
                const group: string = groups[index];
                if (this.rules.groupRules[group]) {
                    const rule: Rule = this.rules.groupRules[group];
                    if (exportType && rule.operations.includes('read')) {
                        if (exportType === 'system') {
                            // TODO: Enable supporting of different profiles by specifying the resources you would want to export
                            // in BASE_R4_RESOURCES
                            if (
                                (this.fhirVersion === '4.0.1' &&
                                    isEqual(rule.resources.sort(), BASE_R4_RESOURCES.sort())) ||
                                (this.fhirVersion === '3.0.1' &&
                                    isEqual(rule.resources.sort(), BASE_STU3_RESOURCES.sort()))
                            ) {
                                return;
                            }
                        }
                        if (exportType === 'group' || exportType === 'patient') {
                            let matchEveryResource = false;
                            if (this.fhirVersion === '4.0.1') {
                                matchEveryResource = R4_PATIENT_COMPARTMENT_RESOURCES.every((resource: string) => {
                                    return rule.resources.includes(resource);
                                });
                            } else if (this.fhirVersion === '3.0.1') {
                                matchEveryResource = STU3_PATIENT_COMPARTMENT_RESOURCES.every((resource: string) => {
                                    return rule.resources.includes(resource);
                                });
                            }
                            if (matchEveryResource) {
                                return;
                            }
                            throw new UnauthorizedError('Unauthorized');
                        }
                    }
                }
            }
        } else if (operation === 'initiate-import') {
            // TODO Handle `initiate-import` auth
        }

        throw new UnauthorizedError('Unauthorized');
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
    getRequesterUserId(accessToken: string): string {
        const decoded = decode(accessToken, { json: true }) || {};
        return decoded.sub;
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
