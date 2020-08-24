# fhir-works-on-aws-authz-rbac

## Purpose

Please visit [fhir-works-on-aws-deployment](https://github.com/awslabs/fhir-works-on-aws-deployment) for overall vision of the project and for more context.

This package is an implementation of the authorization interface. It uses the user group claims found in the incoming JWT access token to determine if the user has permissions to do the requested action. This also means that it assumes the user correctly obtained an access token from cognito by using scopes of either:

- `openid profile` Must have both
- `aws.cognito.signin.user.admin`

To use and deploy this component (with the other default components) please follow the overall [README](https://github.com/awslabs/fhir-works-on-aws-deployment)

## Usage

For usage please add this package to your `package.json` file and install as a dependency. For usage examples please see the [deployment component](https://github.com/awslabs/fhir-works-on-aws-deployment)

## Dependency tree

This package is dependent on:

- [interface component](https://github.com/awslabs/fhir-works-on-aws-interface)
  - This package defines the interface we are trying to use
- [deployment component](https://github.com/awslabs/fhir-works-on-aws-deployment)
  - This package deploys this and all the default components

## Known issues

For known issues please track the issues on the GitHub repository

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.
