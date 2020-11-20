# Changelog

All notable changes to this project will be documented in this file.

## [4.0.0] - 2020-11-11

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
