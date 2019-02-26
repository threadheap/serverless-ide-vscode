[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/ThreadHeap.serverless-ide-vscode.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=ThreadHeap.serverless-ide-vscode)

# Serverless IDE: Enahnced support of AWS SAM in Visual Studio Code

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

-   `serverlessIDE.SAM.templatePattern`: Pattern for SAM files (default to `*.sam.yaml`)
-   `serverlessIDE.CloudFormation.templatePattern`: Pattern for CloudFormation files (default to `*.cf.yaml`)
-   `serverlessIDE.validate`: Enable/disable validation feature
-   `serverlessIDE.hover`: Enable/disable hover documentation
-   `serverlessIDE.completion`: Enable/disable autocompletion
-   `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
    -   `editor.insertSpaces`
    -   `editor.tabSize`
    -   `editor.quickSuggestions`

## Questions and feedback

Feature requests and feedback are very appreciated

Feel free to raise a feature request in [the project repository](https://github.com/threadheap/serverless-ide-vscode/issues).

Check out [public roadmap board](https://github.com/threadheap/serverless-ide-vscode/projects/1?add_cards_query=is%3Aopen) and vote for new features.

DM or follow me on [twitter](https://twitter.com/pvl4sov) or [medium](https://medium.com/@pvlasov)
