# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.1.0](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/compare/v4.0.1...v4.1.0) (2021-01-13)


### Features

* Implement 'getSearchFilterBasedOnIdentity' ([#20](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/issues/20)) ([0b3d738](https://github.com/awslabs/fhir-works-on-aws-authz-rbac/commit/0b3d738280b07aa0e0adfd0aa7398adc0e6025a5))

## [4.0.1] - 2020-12-07

### Added

- chore: We no longer require Auth for metadata route, because router does not Authorize metadata route

## [4.0.0] - 2020-11-20

### Added

- feat: Implement `fhir-works-on-aws-interface` v4.0.0
  - Authorization interfaces to use `userIdentity` instead of access_token
  - `isAuthorized` renamed to `verifyAccessToken`
  - `getRequesterUserId` method removed, as it is now redundant

## [3.0.0] - 2020-11-11

### Added

- feat: Implement `fhir-works-on-aws-interface` v3.0.0
  - This adds 4 new methods to this package
  - Throwing UnauthorizedError instead of a boolean

## [2.0.0] - 2020-09-25

### Added

- Implement `fhir-works-on-aws-interface` v2.0.0

## [1.0.0] - 2020-08-31

### Added

- Initial launch! :rocket:
