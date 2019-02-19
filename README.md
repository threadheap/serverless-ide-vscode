[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/ThreadHeap.serverless-ide-vscode.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=ThreadHeap.serverless-ide-vscode)

# Serverless IDE: Enahnced support of AWS SAM in Visual Studio Code

Provides comprehensive AWS SAM (Serverless Application Model) and Cloudformation support to [Visual Studio Code](https://code.visualstudio.com/).

## Features

![Demo](https://raw.githubusercontent.com/threadheap/serverless-ide-vscode/master/packages/client/demo/demo.gif)

1. Validation:
    - Detects whether the entire file is valid SAM template
    - Detects errors such as:
        - Node is not found
        - Node has an invalid key node type
        - Node has an invalid type
        - Node is not a valid child node
2. Auto completion (<kbd>Ctrl</kbd> + <kbd>Space</kbd>):
    - Auto completes on all commands
    - Auto completes CloudFormation resources
3. Formatter:
    - Allows for formatting the current file

# Settings

The following settings are supported:

-   `serverlessIDE.provider`: Provider (default to aws-sam)
-   `serverlessIDE.templatePattern`: Pattern for config file name (default to `*.sam.yaml`)
-   `serverlessIDE.validate`: Enable/disable validation feature
-   `serverlessIDE.hover`: Enable/disable hover
-   `serverlessIDE.completion`: Enable/disable autocompletion
-   `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
    -   `editor.insertSpaces`
    -   `editor.tabSize`
    -   `editor.quickSuggestions`

## Contributions

All contributions are welcome!

### Getting started

1. Install prerequisites:
    - latest [Visual Studio Code](https://code.visualstudio.com/)
    - [Node.js](https://nodejs.org/) v10.9.0 or higher
2. Fork and clone this repository
3. Install lerna and dependencies

```sh
    yarn global add lerna
    lerna bootstrap
```

4. Compile Typescript

```sh
    lerna compile
```

#### Developing the client side

1. Open `packages/client` in vscode
2. Make changes as neccessary and the run the code using `Launch Extension` command (F5)

#### Developing the server side

1. Open `packages/server` in vscode

Refer to VS Code [documentation](https://code.visualstudio.com/docs/extensions/debugging-extensions) on how to run and debug the extension

#### Update SAM json schema

1. Open `packages/sam-schema`
2. Make changes and run `yarn generate` to update schema
3. Check changes with `Launch Extension` command

## Credits

Projects is a hard fork of [vscode-yaml](https://github.com/redhat-developer/vscode-yaml)
and [yaml-language-server](https://github.com/redhat-developer/yaml-language-server) that is
tuned for better support of AWS CloudFormation templates.

## License

MIT
