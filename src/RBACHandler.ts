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
    SUPPORTED_R4_RESOURCES,
    SUPPORTED_STU3_RESOURCES,
    FhirVersion,
    PATIENT_COMPARTMENT_RESOURCES,
    R4Resource,
    ExportType,
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

    isAuthorized(request: AuthorizationRequest): boolean {
        const decoded = decode(request.accessToken, { json: true }) || {};
        const groups: string[] = decoded['cognito:groups'] || [];

        if (request.exportType) {
            return this.isExportAllowed(groups, request.exportType);
        }
        return this.isAllowed(groups, request.operation, request.resourceType);
    }

    private isExportAllowed(groups: string[], exportType: ExportType): boolean {
        for (let index = 0; index < groups.length; index += 1) {
            const group: string = groups[index];
            if (this.rules.groupRules[group]) {
                const rule: Rule = this.rules.groupRules[group];
                if (exportType) {
                    if (exportType === 'system') {
                        if (
                            (this.fhirVersion === '4.0.1' &&
                                isEqual(rule.resources.sort(), SUPPORTED_R4_RESOURCES.sort())) ||
                            (this.fhirVersion === '3.0.1' &&
                                isEqual(rule.resources.sort(), SUPPORTED_STU3_RESOURCES.sort()))
                        ) {
                            return true;
                        }
                    }
                    if (exportType === 'group' || exportType === 'patient') {
                        return rule.resources.every(resource => {
                            return PATIENT_COMPARTMENT_RESOURCES.includes(<R4Resource>resource);
                        });
                    }
                }
            }
        }
        return false;
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

    // eslint-disable-next-line class-methods-use-this
    getRequesterUserId(accessToken: string): string {
        const decoded = decode(accessToken, { json: true }) || {};
        return decoded.username;
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
