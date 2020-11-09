import * as vscode from 'vscode';
import * as logs from './logs';
import { State } from './state';

export class LogTailer {

    private logsViewer: vscode.TreeView<any>;
    private logsTreeDataProvider: logs.LogsTreeDataProvider;
    //private runsViewer: vscode.TreeView<any>;
    //private runsTreeDataProvider: runs.RunsTreeDataProvider;
    private state: State;

    constructor(private context: vscode.ExtensionContext) {
        this.state = new State(context);

        // logs view
        this.logsTreeDataProvider = new logs.LogsTreeDataProvider(context, this.state,
            (event: string, log: string) => {
                switch (event) {
                    case 'started':
                    case 'updated':
                    case 'stopped':
                    case 'added':
                        //this.runsTreeDataProvider.refresh(log);
                        break;
                    case 'removed':
                        //this.runsTreeDataProvider.refresh();
                        break;
                    default:
                        break;
                }
            });
        this.logsViewer = vscode.window.createTreeView('logs', { treeDataProvider: this.logsTreeDataProvider });
        /*
        this.logsViewer.onDidChangeSelection(e => {
           this.onDidChangeLogsSelection(e.selection);
        });
  
        // runs view
        this.runsTreeDataProvider = new runs.RunsTreeDataProvider(context, this.state);
        this.runsViewer = vscode.window.createTreeView('runs', { treeDataProvider : this.runsTreeDataProvider, canSelectMany: true });
  
        this.runsViewer.onDidChangeSelection(e => {
           this.onDidChangeRunsSelection(e.selection);
        });*/

        // register commands
        this.registerCommands(context);
    }

    private registerCommands(context: vscode.ExtensionContext) {
        // logs 
        this.registerCommand(context, 'logs.add', async () => {
            try {
                this.logsTreeDataProvider.add();
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.remove', async (dependency: logs.Dependency) => {
            try {
                const removed = await this.logsTreeDataProvider.rem(dependency.name);
                if (removed) {
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.removeAll', async () => {
            try {
                const removed = await this.logsTreeDataProvider.remAll();
                if (removed) {
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });
        /*
        this.registerCommand(context, 'logs.addScript', async (dependency: logs.Dependency) => {
            try {
                this.logsTreeDataProvider.addScript(dependency.name);
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.run', (dependency: logs.Dependency) => {
            try {
                // save modified workspace files before running
                vscode.workspace.saveAll(false).then(onfullfilled => {
                    this.logsTreeDataProvider.run(dependency.name);
                    //this.runsTreeDataProvider.refresh(dependency.name);
                });
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.stop', (dependency: logs.Dependency) => {
            try {
                this.logsTreeDataProvider.stop(dependency.name);
                //this.runsTreeDataProvider.refresh(dependency.name);
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.rename', async (dependency: logs.Dependency) => {
            try {
                const renamed = await this.logsTreeDataProvider.rename(dependency.name);
                if (renamed) {
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.moveUp', (dependency: logs.Dependency) => {
            try {
                let logArr = this.state.getLogs();
                const index = logArr.indexOf(dependency.name);
                if (index >= 1) {
                    logArr.splice(index - 1, 0, logArr.splice(index, 1)[0]);
                    this.state.setLogs(logArr);
                    this.logsTreeDataProvider.refresh();
                }      
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.moveDown', (dependency: logs.Dependency) => {
            try {
                let logArr = this.state.getLogs();
                const index = logArr.indexOf(dependency.name);
                if (index >= 0 && index < logArr.length - 1) {
                    logArr.splice(index + 1, 0, logArr.splice(index, 1)[0]);
                    this.state.setLogs(logArr);
                    this.logsTreeDataProvider.refresh();
                }      
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.removeDep', (dependency: logs.Dependency) => {
            try {
                const removed = this.logsTreeDataProvider.remDep(dependency);
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.moveScriptUp', (dependency: logs.Dependency) => {
            try {
                this.logsTreeDataProvider.moveUp(dependency);
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.moveScriptDown', (dependency: logs.Dependency) => {
            try {
                this.logsTreeDataProvider.moveDown(dependency);
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });
        */
        this.registerCommand(context, 'logs.openFile', (log: logs.Log) => {
            try {
                if (log.uri !== undefined) {
                    this.logsTreeDataProvider.open(log.uri);
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.autoScrollOn', (dependency: logs.Dependency) => {
            try {
                if (dependency.resourceUri !== undefined) {
                    this.logsTreeDataProvider.autoScroll(dependency.resourceUri, true);
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });

        this.registerCommand(context, 'logs.autoScrollOff', (dependency: logs.Dependency) => {
            try {
                if (dependency.resourceUri !== undefined) {
                    this.logsTreeDataProvider.autoScroll(dependency.resourceUri, false);
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.toString());
            }
        });
    }

    private registerCommand(context: vscode.ExtensionContext, command: string, callback: (...args: any[]) => any, thisArg?: any) {
        try {
            let disposable = vscode.commands.registerCommand(command, callback);
            context.subscriptions.push(disposable);
        } catch (err) {
            vscode.window.showErrorMessage(err.toString());
        }
    }

    /*private onDidChangeLogsSelection(selection: logs.Dependency[]) {
       if (selection[0].contextValue === 'log') {
       }
    }
 
    private onDidChangeRunsSelection(selection: any[])  {
       // TODO
    }*/
}