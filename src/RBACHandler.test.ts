/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import {
    R4_PATIENT_COMPARTMENT_RESOURCES,
    R4Resource,
    BASE_R4_RESOURCES,
    TypeOperation,
    STU3_PATIENT_COMPARTMENT_RESOURCES,
    FhirVersion,
    BASE_STU3_RESOURCES,
} from 'fhir-works-on-aws-interface';
import shuffle from 'shuffle-array';
import each from 'jest-each';
import { RBACHandler } from './RBACHandler';
import { RBACConfig } from './RBACConfig';

const financialResources: R4Resource[] = [
    'Coverage',
    'CoverageEligibilityRequest',
    'CoverageEligibilityResponse',
    'EnrollmentRequest',
    'EnrollmentResponse',
    'Claim',
    'ClaimResponse',
    'Invoice',
    'PaymentNotice',
    'PaymentReconciliation',
    'Account',
    'ChargeItem',
    'ChargeItemDefinition',
    'Contract',
    'ExplanationOfBenefit',
    'InsurancePlan',
];

const RBACRules: RBACConfig = {
    version: 1.0,
    groupRules: {
        practitioner: {
            operations: ['create', 'read', 'update', 'delete', 'vread', 'search-type', 'transaction'],
            resources: [...financialResources, 'Patient'],
        },
        'non-practitioner': {
            operations: ['read', 'vread', 'search-type'],
            resources: financialResources,
        },
        auditor: {
            operations: ['read', 'vread', 'search-type'],
            resources: ['Patient'],
        },
    },
};
// Decoded JWT
// {
//   "sub": "fake",
//   "username": "FakeUser",
//   "iat": 1516239022
// }
const noGroupsAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwidXNlcm5hbWUiOiJGYWtlVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.v9lkm0coU0t-dUFvBqhV8oMxWG-eU09AupJN4UlfVDI';
// Decoded JWT
// {
//  "sub": "fake",
//  "cognito:groups": [
//   "non-practitioner",
//   "auditor"
//  ],
//  "username": "FakeUser",
//  "iat": 1516239022,
//  "jti": "f30cd238-5b16-4dcd-8968-332f5d75ddc4",
//  "exp": 1600023733
// }
const nonPractAndAuditorAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsibm9uLXByYWN0aXRpb25lciIsImF1ZGl0b3IiXSwidXNlcm5hbWUiOiJGYWtlVXNlciIsImlhdCI6MTUxNjIzOTAyMn0._9NJHvjM42dFaVHrzAYPqNfUv0-Qdo6q7vKyvTofdsA';
// Decoded JWT
// {
//  "sub": "fake",
//  "cognito:groups": [
//   "practitioner"
//  ],
//  "username": "FakeUser",
//  "iat": 1516239022,
//  "jti": "2fac726b-6bb0-4bd3-ba00-326c4c9801f4",
//  "exp": 1600023504
// }
const practitionerAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsicHJhY3RpdGlvbmVyIl0sInVzZXJuYW1lIjoiRmFrZVVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.XnapGEmAOikHbQ5wyGm7josZszAcNlR1FY0CgsYF8wo';

describe('isAuthorized', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

    test('TRUE; read direct patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'read',
            id: '1324',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; create direct patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'create',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; transaction; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            operation: 'transaction',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; update direct patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'update',
            id: '1324',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; DELETE patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'delete',
            id: '1324',
        });
        expect(results).toEqual(true);
    });

    test('FASLE; patch patient; practitioner', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: practitionerAccessToken,
            resourceType: 'Patient',
            operation: 'patch',
            id: '1324',
        });
        expect(results).toEqual(false);
    });
    test('TRUE; GET capability statement; no groups', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: 'notReal',
            operation: 'read',
            resourceType: 'metadata',
        });
        expect(results).toEqual(true);
    });
    test('FALSE; GET Patient; no groups', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: noGroupsAccessToken,
            resourceType: 'Patient',
            operation: 'read',
            id: '1324',
        });
        expect(results).toEqual(false);
    });
    test('FALSE; POST Patient; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'create',
        });
        expect(results).toEqual(false);
    });
    test('TRUE; GET Patient; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'read',
            id: '1324',
        });
        expect(results).toEqual(true);
    });
    test('TRUE; Patient Search; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'search-type',
        });
        expect(results).toEqual(true);
    });
    test('FALSE; Global Search; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            operation: 'search-system',
        });
        expect(results).toEqual(false);
    });
    test('TRUE; GET specific Patient history; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'vread',
            id: '1324',
            vid: '1324',
        });
        expect(results).toEqual(true);
    });
    test('FALSE; GET Patient history; non-practitioner/auditor', async () => {
        const results: boolean = authZHandler.isAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            resourceType: 'Patient',
            operation: 'history-type',
        });
        expect(results).toEqual(false);
    });

    test('ERROR: Attempt to create a handler to support a new config version', async () => {
        expect(() => {
            // eslint-disable-next-line no-new
            new RBACHandler(
                {
                    version: 2.0,
                    groupRules: {},
                },
                '4.0.1',
            );
        }).toThrow(new Error('Configuration version does not match handler version'));
    });
});

describe('isAuthorized:Export', () => {
    const getTestPractitionerRBACRules = (operations: TypeOperation[], resources: any) => ({
        version: 1.0,
        groupRules: {
            practitioner: {
                operations,
                resources,
            },
        },
    });

    // const getBaseResource = (fhirVersion: string) => {
    //     return fhirVersion === '3.0.1' ? BASE_STU3_RESOURCES : BASE_R4_RESOURCES;
    // };
    //
    // each(['3.0.1', '4.0.1']).test('TRUE:%s: GET system Export with permission to all resources', fhirVersion => {
    //     const authZHandler: RBACHandler = new RBACHandler(
    //         getTestPractitionerRBACRules(['read'], getBaseResource(fhirVersion)),
    //         fhirVersion,
    //     );
    //     const results: boolean = authZHandler.isAuthorized({
    //         accessToken: practitionerAccessToken,
    //         operation: 'read',
    //         export: {
    //             operation: 'initiate-export',
    //             type: 'system',
    //         },
    //     });
    //     expect(results).toEqual(true);
    // });

    const fhirVersions: FhirVersion[] = ['3.0.1', '4.0.1'];
    fhirVersions.forEach((fhirVersion: FhirVersion) => {
        const BASE_RESOURCES = fhirVersion === '3.0.1' ? BASE_STU3_RESOURCES : BASE_R4_RESOURCES;
        const PATIENT_COMPARTMENT =
            fhirVersion === '3.0.1' ? STU3_PATIENT_COMPARTMENT_RESOURCES : R4_PATIENT_COMPARTMENT_RESOURCES;
        describe('initiate-export', () => {
            test(`TRUE:${fhirVersion}: GET system Export with permission to all resources`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], BASE_RESOURCES),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'system',
                    },
                });
                expect(results).toEqual(true);
            });

            test(`TRUE:${fhirVersion}: GET system Export with permission to all resources, in mixed order`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], shuffle(BASE_RESOURCES, { copy: true })),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'system',
                    },
                });
                expect(results).toEqual(true);
            });

            test(`FALSE:${fhirVersion}: GET system Export without permission to all resources`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], ['Patient', 'MedicationRequest']),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'system',
                    },
                });
                expect(results).toEqual(false);
            });

            test(`FALSE:${fhirVersion}: GET system Export with permission to CREATE all resources but not READ them`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['create'], BASE_RESOURCES),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'system',
                    },
                });
                expect(results).toEqual(false);
            });

            test(`TRUE:${fhirVersion}: GET patient Export with permission to all resources in Patient compartment`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], PATIENT_COMPARTMENT),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'patient',
                    },
                });
                expect(results).toEqual(true);
            });

            test(`FALSE:${fhirVersion}: GET patient Export without permission to all resources in Patient compartment`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], ['Patient', 'Account']),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'patient',
                    },
                });
                expect(results).toEqual(false);
            });

            test(`TRUE:${fhirVersion}: GET group Export with permission to all resources in Patient compartment`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], PATIENT_COMPARTMENT),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'group',
                    },
                });
                expect(results).toEqual(true);
            });

            test(`FALSE:${fhirVersion}: GET group Export without permission to all resources in Patient compartment`, async () => {
                const authZHandler: RBACHandler = new RBACHandler(
                    getTestPractitionerRBACRules(['read'], ['Patient', 'Account']),
                    fhirVersion,
                );
                const results: boolean = authZHandler.isAuthorized({
                    accessToken: practitionerAccessToken,
                    operation: 'read',
                    bulkDataAuth: {
                        operation: 'initiate-export',
                        exportType: 'group',
                    },
                });
                expect(results).toEqual(false);
            });
        });

        test(`TRUE:${fhirVersion}: Get job status`, () => {
            const authZHandler: RBACHandler = new RBACHandler(
                getTestPractitionerRBACRules(['read'], BASE_RESOURCES),
                fhirVersion,
            );
            const results: boolean = authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                operation: 'read',
                bulkDataAuth: {
                    operation: 'get-status-export',
                    exportType: 'system',
                },
            });
            expect(results).toEqual(true);
        });

        test(`TRUE:${fhirVersion}: Cancel job`, () => {
            const authZHandler: RBACHandler = new RBACHandler(
                getTestPractitionerRBACRules(['delete'], BASE_RESOURCES),
                fhirVersion,
            );
            const results: boolean = authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                operation: 'delete',
                bulkDataAuth: {
                    operation: 'cancel-export',
                    exportType: 'system',
                },
            });
            expect(results).toEqual(true);
        });
    });
});

describe('isBundleRequestAuthorized', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

    test('TRUE; create direct patient in bundle; practitioner', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: practitionerAccessToken,
            requests: [{ operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' }],
        });
        expect(results).toEqual(true);
    });

    test('TRUE; create & read direct patient in bundle; practitioner', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: practitionerAccessToken,
            requests: [
                { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
                { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
            ],
        });
        expect(results).toEqual(true);
    });

    test('FALSE; create & read direct patient in bundle; nonPractAndAuditor', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            requests: [
                { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
                { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
            ],
        });
        expect(results).toEqual(false);
    });
    test('FALSE; create & read direct patient in bundle; nonPractAndAuditor', async () => {
        const results: boolean = await authZHandler.isBundleRequestAuthorized({
            accessToken: nonPractAndAuditorAccessToken,
            requests: [
                { operation: 'create', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
                { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
            ],
        });
        expect(results).toEqual(false);
    });
});
