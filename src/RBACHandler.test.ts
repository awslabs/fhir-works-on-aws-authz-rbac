/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
import { R4Resource, UnauthorizedError } from 'fhir-works-on-aws-interface';
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
    const authZHandler: RBACHandler = new RBACHandler(RBACRules);

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
            new RBACHandler({
                version: 2.0,
                groupRules: {},
            });
        }).toThrow(new Error('Configuration version does not match handler version'));
    });
});

describe('isBundleRequestAuthorized', () => {
    const authZHandler: RBACHandler = new RBACHandler(RBACRules);

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
