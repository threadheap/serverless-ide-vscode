[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/ThreadHeap.serverless-ide-vscode.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=ThreadHeap.serverless-ide-vscode)

# Serverless IDE: Enhanced support of AWS SAM in Visual Studio Code

Provides comprehensive AWS SAM (Serverless Application Model) and Cloudformation support to [Visual Studio Code](https://code.visualstudio.com/).

## Features

### Validation and smart autocompletion

Extension provides template valication and smart snippets for AWS CloudFormation resources.
Just start typing and then pick from available options

![Demo](https://raw.githubusercontent.com/threadheap/serverless-ide-vscode/master/packages/vscode/demo/autocomplete.gif)

### AWS documentation at glance

You can view resources documentation at glance just by hovering resources and properties
in the template

![Demo](https://raw.githubusercontent.com/threadheap/serverless-ide-vscode/master/packages/vscode/demo/documentation.gif)

## Settings

The following settings are supported:
-   `serverlessIDE.validate`: Enable/disable validation feature
-   `serverlessIDE.hover`: Enable/disable hover documentation
-   `serverlessIDE.completion`: Enable/disable autocompletion
-   `serverlessIDE.validationProvider` : Validation provider. Can be `default` (uses json schema) or [`cfn-lint`](https://github.com/aws-cloudformation/cfn-python-lint)
-    `serverlessIDE.telemetry.enableTelemetry` : Enable/disable telemetry and crash reporting

[cfn-lint](https://github.com/aws-cloudformation/cfn-python-lint) is used as default validator
More information about installation and configuration can be found [here](https://github.com/aws-cloudformation/cfn-python-lint)

-    `serverlessIDE.cfnLint.path` : Path to cfn-lint command (default to `cfn-lint`)
-    `serverlessIDE.cfnLint.appendRules` : Additional cfn-lint rules
-    `serverlessIDE.cfnLint.ignoreRules` : Array of rules to ignore

Language settings:

-   `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
    -   `editor.insertSpaces`
    -   `editor.tabSize`
    -   `editor.quickSuggestions`

## Telemetry

ServerlessIDE collects usage data and metrics to help us improve the extension for VS Code.

### What data is collected?

ServerlessIDE collects anonymous information related to the usage of the extensions, such as which commands were run, as well as performance and error data.

### How do I disable telemetry reporting?

On Windows or Linux, select `File > Preferences > Settings`. On macOS, select `Code > Preferences > Settings`. Then, to silence all telemetry events from the VS Code shell and disable telemetry reporting, add the following option.

```
"serverlessIDE.telemetry.enableTelemetry": false
```

IMPORTANT: This option requires a restart of VS Code to take effect.

NOTE: We also respect the global telemetry setting telemetry.enableTelemetry; if that is set to false, ServerlessIDE telemetry is disabled. For more information see [Microsoft’s documentation](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Contributions

You can find [the code on GitHub repository](https://github.com/threadheap/serverless-ide-vscode)

## Questions and feedback

Feature requests and feedback are very appreciated

Feel free to raise a feature request in [the project repository](https://github.com/threadheap/serverless-ide-vscode/issues).

Check out [public roadmap board](https://github.com/threadheap/serverless-ide-vscode/projects/1?add_cards_query=is%3Aopen) and vote for new features.

DM or follow me on [twitter](https://twitter.com/pvl4sov) or [medium](https://medium.com/@pvlasov)


### Author

[Pavel Vlasov](https://github.com/pavelvlasov)

### License

Apache License 2.0
