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
    AccessBulkDataJobRequest,
    UnauthorizedError,
} from 'fhir-works-on-aws-interface';
import shuffle from 'shuffle-array';
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

const noGroupsAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.kCA912Pb__JP54WjgZOazu1x8w5KU-kL0iRwQEVFNPw';

const nonPractAndAuditorAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsibm9uLXByYWN0aXRpb25lciIsImF1ZGl0b3IiXSwibmFtZSI6Im5vdCByZWFsIiwiaWF0IjoxNTE2MjM5MDIyfQ.HBNrpqQZPvj43qv1QNFr5u9PoHrtqK4ApsRpN2t7Rz8';

const practitionerAccessToken: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwiY29nbml0bzpncm91cHMiOlsicHJhY3RpdGlvbmVyIl0sIm5hbWUiOiJub3QgcmVhbCIsImlhdCI6MTUxNjIzOTAyMn0.bhZZ2O8Vph5aiPfs1n34Enw0075Tt4Cnk2FL2C3mHaQ';

beforeEach(() => {
    expect.assertions(1);
});
describe('isAuthorized', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

    test('read direct patient with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                resourceType: 'Patient',
                operation: 'read',
                id: '1324',
            }),
        ).resolves.not.toThrow();
    });
    test('create direct patient with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                resourceType: 'Patient',
                operation: 'create',
            }),
        ).resolves.not.toThrow();
    });
    test('transaction with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                operation: 'transaction',
            }),
        ).resolves.not.toThrow();
    });
    test('update direct patient with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                resourceType: 'Patient',
                operation: 'update',
                id: '1324',
            }),
        ).resolves.not.toThrow();
    });
    test('DELETE patient with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                resourceType: 'Patient',
                operation: 'delete',
                id: '1324',
            }),
        ).resolves.not.toThrow();
    });

    test('patch patient with practitioner role; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                resourceType: 'Patient',
                operation: 'patch',
                id: '1324',
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });
    test('GET capability statement with no groups; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: 'notReal',
                operation: 'read',
                resourceType: 'metadata',
            }),
        ).resolves.not.toThrow();
    });
    test('GET Patient with no groups; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: noGroupsAccessToken,
                resourceType: 'Patient',
                operation: 'read',
                id: '1324',
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });
    test('POST Patient with non-practitioner/auditor; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                resourceType: 'Patient',
                operation: 'create',
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });
    test('GET Patient with non-practitioner/auditor; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                resourceType: 'Patient',
                operation: 'read',
                id: '1324',
            }),
        ).resolves.not.toThrow();
    });
    test('search patients with non-practitioner/auditor; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                resourceType: 'Patient',
                operation: 'search-type',
            }),
        ).resolves.not.toThrow();
    });
    test('search globally with non-practitioner/auditor; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                operation: 'search-system',
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });
    test('read specific Patient history with non-practitioner/auditor role; expected: pass', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                resourceType: 'Patient',
                operation: 'vread',
                id: '1324',
                vid: '1324',
            }),
        ).resolves.not.toThrow();
    });
    test('read Patients history; non-practitioner/auditor; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                resourceType: 'Patient',
                operation: 'history-type',
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });

    test('Attempt to create a handler to support a new config version; expected Error', async () => {
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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
                const results: boolean = await authZHandler.isAuthorized({
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

        test(`TRUE:${fhirVersion}: Get export job status`, async () => {
            const authZHandler: RBACHandler = new RBACHandler(
                getTestPractitionerRBACRules(['read'], BASE_RESOURCES),
                fhirVersion,
            );
            const results: boolean = await authZHandler.isAuthorized({
                accessToken: practitionerAccessToken,
                operation: 'read',
                bulkDataAuth: {
                    operation: 'get-status-export',
                    exportType: 'system',
                },
            });
            expect(results).toEqual(true);
        });

        test(`TRUE:${fhirVersion}: Cancel export job`, async () => {
            const authZHandler: RBACHandler = new RBACHandler(
                getTestPractitionerRBACRules(['delete'], BASE_RESOURCES),
                fhirVersion,
            );
            const results: boolean = await authZHandler.isAuthorized({
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

    test('create direct patient in bundle with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isBundleRequestAuthorized({
                accessToken: practitionerAccessToken,
                requests: [{ operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' }],
            }),
        ).resolves.not.toThrow();
    });

    test('create & read direct patient in bundle with practitioner role; expected: pass', async () => {
        await expect(
            authZHandler.isBundleRequestAuthorized({
                accessToken: practitionerAccessToken,
                requests: [
                    { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
                    { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
                ],
            }),
        ).resolves.not.toThrow();
    });

    test('create & read direct patient in bundle with nonPractAndAuditor; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isBundleRequestAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                requests: [
                    { operation: 'read', id: 'id', resource: 'Patient/id', resourceType: 'Patient' },
                    { operation: 'create', id: 'id', resource: { active: true }, resourceType: 'Patient' },
                ],
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });
    test('create 2 patients in a bundle with nonPractAndAuditor role; expected: UnauthorizedError', async () => {
        await expect(
            authZHandler.isBundleRequestAuthorized({
                accessToken: nonPractAndAuditorAccessToken,
                requests: [
                    { operation: 'create', id: 'id1', resource: 'Patient/id', resourceType: 'Patient' },
                    { operation: 'create', id: 'id2', resource: { active: true }, resourceType: 'Patient' },
                ],
            }),
        ).rejects.toThrowError(UnauthorizedError);
    });
});
describe('authorizeAndFilterReadResponse', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules);

    test('authorize final read response; expected: pass', async () => {
        const expected = { id: 'id', resource: { active: true }, resourceType: 'Patient' };
        await expect(
            authZHandler.authorizeAndFilterReadResponse({
                accessToken: practitionerAccessToken,
                operation: 'read',
                readResponse: expected,
            }),
        ).resolves.toEqual(expected);
    });
    test('authorize final search response; expected: pass', async () => {
        const expected = { id: 'id214', resource: { active: true }, resourceType: 'Patient' };
        await expect(
            authZHandler.authorizeAndFilterReadResponse({
                accessToken: practitionerAccessToken,
                operation: 'search-type',
                readResponse: expected,
            }),
        ).resolves.toEqual(expected);
    });
});

describe('getAllowedResourceTypesForOperation', () => {
    test('Single group', async () => {
        const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
        await expect(
            authZHandler.getAllowedResourceTypesForOperation({
                accessToken: practitionerAccessToken,
                operation: 'search-type',
            }),
        ).resolves.toEqual([...financialResources, 'Patient']);
    });

    test('No groups', async () => {
        const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
        await expect(
            authZHandler.getAllowedResourceTypesForOperation({
                accessToken: noGroupsAccessToken,
                operation: 'search-type',
            }),
        ).resolves.toEqual([]);
    });

    test('Multiple groups', async () => {
        const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
        await expect(
            authZHandler.getAllowedResourceTypesForOperation({
                accessToken: nonPractAndAuditorAccessToken,
                operation: 'search-type',
            }),
        ).resolves.toEqual([...financialResources, 'Patient']);
    });

    test('operation not allowed', async () => {
        const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
        await expect(
            authZHandler.getAllowedResourceTypesForOperation({
                accessToken: nonPractAndAuditorAccessToken,
                operation: 'history-instance',
            }),
        ).resolves.toEqual([]);
    });
});

describe('isAllowedToAccessBulkDataJob', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');

    test('TRUE: JobOwnerId and requesterUserId matches', () => {
        const accessBulkDataJobRequest: AccessBulkDataJobRequest = {
            jobOwnerId: 'userId-1',
            requesterUserId: 'userId-1',
        };
        const isAllowed = authZHandler.isAccessBulkDataJobAllowed(accessBulkDataJobRequest);
        expect(isAllowed).toBeTruthy();
    });

    test('FALSE: JobOwnerId and requesterUserId does not match', () => {
        const accessBulkDataJobRequest: AccessBulkDataJobRequest = {
            jobOwnerId: 'userId-1',
            requesterUserId: 'userId-2',
        };
        const isAllowed = authZHandler.isAccessBulkDataJobAllowed(accessBulkDataJobRequest);
        expect(isAllowed).toBeFalsy();
    });
});

describe('getRequesterUserId', () => {
    // Decoded Access Token
    // {
    //     "sub": "fakeSub1",
    //     "username": "FakeUser",
    //     "iat": 1516239022
    // }
    const accessToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlU3ViMSIsInVzZXJuYW1lIjoiRmFrZVVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.QYnnbabXcPCa5fqr5Fymr2xuC0aJtkPHXxNqta0PT8U';
    const authZHandler: RBACHandler = new RBACHandler(RBACRules, '4.0.1');
    test('getRequestUserId matches access token sub', () => {
        expect(authZHandler.getRequesterUserId(accessToken)).toEqual('fakeSub1');
    });
});
