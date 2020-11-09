import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { Script } from 'vm';
import { prototype } from 'events';
import { State } from './state';
import { Pipe } from 'stream';
import { getVSCodeDownloadUrl } from 'vscode-test/out/util';
import { URLSearchParams } from 'url';
import { notDeepEqual } from 'assert';
import { formatWithOptions } from 'util';

export class Log {
   textEditor: vscode.TextEditor | undefined = undefined;
   watch: vscode.Disposable | undefined = undefined;
   autoScroll: boolean = true;

   constructor(public readonly name: string,
      public readonly uri: vscode.Uri) {
   }

   tail(): void {
      if (this.textEditor !== undefined) {
         const lineCount = this.textEditor.document.lineCount;
         const start = new vscode.Position(lineCount, 0);
         const end = new vscode.Position(lineCount+1, 0);
         const range = new vscode.Range(start, end);
         this.textEditor.revealRange(range);
      }
   }
}
/*
class LogResources {
   constructor(public readonly name: string) {
      //this.outputCh = vscode.window.createOutputChannel(name + " - LogTailer");
   }
}
*/
export class Dependency extends vscode.TreeItem {

   constructor(readonly name: string,
      readonly contextValue?: string,
      readonly collapsibleState?: vscode.TreeItemCollapsibleState,
      readonly resourceUri?: vscode.Uri,
      readonly command?: vscode.Command,
      readonly log?: string) {
      super(name, collapsibleState);
      //super.description = contextValue;
   }
   /*
   get tooltip(): string | undefined {
      return this.resourceUri?.fsPath;
   }

   get description(): string | undefined {
      if (this.contextValue === 'running') {
         return '[' + this.contextValue + ']';
      }
      return undefined;
   }
   */
}

export class LogsTreeDataProvider implements vscode.TreeDataProvider<Dependency> {

   private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined> = new vscode.EventEmitter<Dependency | undefined>();
   readonly onDidChangeTreeData: vscode.Event<Dependency | undefined> = this._onDidChangeTreeData.event;
   //private nameToResourcesMap: { [name: string]: LogResources | undefined; } = {};

   constructor(private context: vscode.ExtensionContext,
      private state: State,
      private on: (event: string, log: string) => void | undefined) {
   }
   /*
   private logResources(name: string): LogResources {
      const res = this.nameToResourcesMap[name] || new LogResources(name);
      this.nameToResourcesMap[name] = res;
      return res;
   }
   */
   refresh(): void {
      this._onDidChangeTreeData.fire(undefined);
   }

   async add() {
      try {
         const uri = await vscode.window.showOpenDialog({ canSelectFolders: false, canSelectFiles: true, canSelectMany: false, openLabel: 'Select Log File', filters: { 'Log': ['log'] } });
         if (uri) {
            // create new Log object
            let log = new Log(path.basename(uri[0].fsPath, '.log'), uri[0]);

            // add new Log object to workspace state
            this.state.addLog(log);

            // TEMP
            let log2 = this.state.getLog(log.name);

            // refresh view
            this.refresh();

            // invoke add event cb
            this.on('added', log.uri.fsPath);
         }
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   async rem(name: string): Promise<boolean> {
      try {
         const log = this.state.getLog(name);
         if (log) {
            //this.nameToResourcesMap[name] = undefined;
            this.state.remLog(name);
            this.refresh();
            // invoke removed event cb
            this.on('removed', name);
            return Promise.resolve(true);
         }
      }
      catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
      return Promise.resolve(false);
   }

   async remAll(): Promise<boolean> {
      try {
         const logs = this.state.getLogs();
         logs.forEach(log => {
            this.rem(log);
         });
         return Promise.resolve(true);
      }
      catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
      return Promise.resolve(false);
   }

   async open(uri: vscode.Uri) {
      try {
         let log = this.state.getLog(path.basename(uri.fsPath, '.log'));
         if (log !== undefined) {
            log.textEditor = await vscode.window.showTextDocument(log.uri);


            log.watch = this.watch(log, {recursive: false, excludes: new Array});
            if (log.autoScroll) {
               log.tail();
            }
         }
      }
      catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   private watch(log: Log, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable | undefined {
      try {
         const watcher = fs.watch(log.uri.fsPath, { recursive: options.recursive }, async (event: string, filename: string | Buffer) => {
            if (event === 'change') {
               if (log.autoScroll) {
                  log.tail();
               }
            }
         });
         return { dispose: () => watcher.close() };
      }
      catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   autoScroll(uri: vscode.Uri, autoScroll: boolean) {
      try {
         let log = this.state.getLog(path.basename(uri.fsPath, '.log'));
         if (log !== undefined) {
            log.autoScroll = autoScroll;
            this.refresh();
         }
      }
      catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }
   /*
   async addScript(name: string) {
      try {
         let log = this.state.getLog(name);
         if (!log) {
            vscode.window.showErrorMessage('Log not found: ' + name);
            return;
         }
         const script = await vscode.window.showOpenDialog({ canSelectFolders: false, canSelectFiles: true, canSelectMany: false, openLabel: 'Select Script File' });//, filters: { 'Nextflow Config': ['config'] } });
         if (script) {
            log.script.push(script[0].fsPath);
            this.state.updateLog(log);
            this.refresh();
         }
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   async rename(name: string): Promise<boolean> {
      try {
         const log = this.state.getLog(name);
         if (!log) {
            vscode.window.showErrorMessage('Log not found: ' + name);
            return Promise.resolve(false);
         }
         const logRes = this.nameToResourcesMap[name];
         if (logRes && logRes.proc !== undefined) {
            vscode.window.showErrorMessage('Log is running; please stop it before attempting to rename');
            return Promise.resolve(false);
         }

         // get rename
         const input = await vscode.window.showInputBox({ prompt: 'Enter new name.', value: name });
         if (!input) {
            return Promise.resolve(false);
         }

         // replace any spaces with '_' to avoid pathing issues when launching container
         //const name = input.replace(/ /g, '_');
         const rename = input;
         if (rename === name) {
            vscode.window.showWarningMessage('Same name entered');
            return Promise.resolve(false);
         }

         // remove old, add new
         this.state.remLog(name);
         let renamed = new Log(rename, log.script);
         this.state.addLog(renamed);
         this.refresh();

         return Promise.resolve(true);
      }
      catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
      return Promise.resolve(false);
   }

   remDep(dependency: Dependency): boolean {
      try {
         if (!dependency.log) {
            return false;
         }
         const logRes = this.nameToResourcesMap[dependency.log];
         if (logRes && logRes.proc !== undefined) {
            vscode.window.showWarningMessage('Log is running; please stop it before attempting to remove dependencies');
            return false;
         }
         let log = this.state.getLog(dependency.log);
         if (log) {
            if (dependency.resourceUri) {
               const index = log.script.indexOf(dependency.resourceUri.fsPath);
               if (index >= 0) {
                  log.script.splice(log.script.indexOf(dependency.resourceUri.fsPath), 1);
                  this.state.updateLog(log);
                  this.refresh();
                  return true;
               }
            }
         }
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
      return false;
   }

   async run(name: string, resume?: boolean | false) {
      try {
         const log = this.state.getLog(name);
         if (!log) {
            vscode.window.showErrorMessage('Log not found: ' + name);
            return;
         }
         const logRes = this.logResources(name);
         if (logRes.proc !== undefined) {
            vscode.window.showErrorMessage('Log already running');
            return;
         }
         if (log.script.length === 0) {
            vscode.window.showErrorMessage('Empty log; add at least one script to run');
            return;
         }

         // check for supported platform
         const platform = this.getPlatform();
         if (platform === undefined) {
            vscode.window.showErrorMessage('Unsupported platform: ' + process.platform);
            return;
         }

         // get script delimiter from settings
         const scriptDelim = this.state.getConfigurationPropertyAsString('scriptDelim', platform);
         if (scriptDelim === undefined) {
            vscode.window.showErrorMessage('Define a script delimiter for your platform in settings before running');
            return;
         }

         // get startup options for shell exe from settings
         let shellOpts: string[] = [];
         const shellOptsPlatform = this.state.getConfigurationPropertyAsString('shellOpts', platform);
         if (shellOptsPlatform !== undefined) {
            shellOpts.push(shellOptsPlatform);
         }

         // formulate params
         let scripts = log.script[0];
         for (let i = 1; i < log.script.length; i++) {
            scripts += scriptDelim;
            scripts += log.script[i];
         }
         let params = shellOpts;
         params.push(scripts);
         
         // clear/show output  
         logRes.outputCh.clear();
         logRes.outputCh.show();

         // get path to shell exe from settings
         const shellExec = this.state.getConfigurationPropertyAsString('shellExec', platform);
         if (shellExec === undefined) {
            vscode.window.showErrorMessage('Define a shell executable for your platform in settings before running');
            return;
         }
         
         // output command being executed
         logRes.outputCh.append(shellExec + ' ');
         params.forEach(param => {
            logRes.outputCh.append(param + ' ');
         });
         logRes.outputCh.append('\n');

         // spawn
         const proc = cp.spawn(shellExec, params);
         logRes.proc = proc;
         this.refresh();

         // invoke started event cb
         this.on('started', name);

         // stdout cb
         proc.stdout.on('data', (data) => {
            // invoke updated event cb
            this.on('updated', name);
            logRes.outputCh.append(data.toString());
         });

         // stderr cb
         proc.stderr.on('data', (data) => {
            // invoke updated event cb
            this.on('updated', name);
            logRes.outputCh.append(data.toString());
         });

         // close cb
         proc.on('close', async (code) => {
            logRes.proc = undefined;
            this.refresh();
            // invoke stopped event cb
            this.on('stopped', name);
         });
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   stop(name: string) {
      try {
         const logRes = this.nameToResourcesMap[name];
         if (logRes) {
            if (logRes.proc === undefined) {
               vscode.window.showWarningMessage('Log not running');
               return;
            }

            logRes.proc.kill("SIGINT");
         }
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   moveUp(dependency: Dependency): boolean {
      try {
         if (!dependency.log) {
            return false;
         }
         const logRes = this.nameToResourcesMap[dependency.log];
         if (logRes && logRes.proc !== undefined) {
            vscode.window.showWarningMessage('Log is running; please stop it before attempting to move dependencies');
            return false;
         }
         let log = this.state.getLog(dependency.log);
         if (log) {
            if (dependency.resourceUri) {
               const index = log.script.indexOf(dependency.resourceUri.fsPath);
               if (index >= 1) {
                  log.script.splice(index - 1, 0, log.script.splice(index, 1)[0]);
                  this.state.updateLog(log);
                  this.refresh();
                  return true;
               }
            }
         }
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
      return false;
   }

   moveDown(dependency: Dependency): boolean {
      try {
         if (!dependency.log) {
            return false;
         }
         const logRes = this.nameToResourcesMap[dependency.log];
         if (logRes && logRes.proc !== undefined) {
            vscode.window.showWarningMessage('Log is running; please stop it before attempting to move dependencies');
            return false;
         }
         let log = this.state.getLog(dependency.log);
         if (log) {
            if (dependency.resourceUri) {
               const index = log.script.indexOf(dependency.resourceUri.fsPath);
               if (index >= 0 && index < log.script.length - 1) {
                  log.script.splice(index + 1, 0, log.script.splice(index, 1)[0]);
                  this.state.updateLog(log);
                  this.refresh();
                  return true;
               }
            }
         }
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
      return false;
   }
   */

   getChildren(element?: Dependency): vscode.ProviderResult<Dependency[]> {
      try {
         if (element) {
            /*let log = this.state.getLog(element.name);
            if (log) {
               let children = new Array<Dependency>();
               // script
               log.script.forEach(script => {
                  children.push(new Dependency(path.basename(script), 'script', vscode.TreeItemCollapsibleState.None, vscode.Uri.file(script), { command: 'logs.openFile', title: "Open File", arguments: [vscode.Uri.file(script)] }, element.name));
               });

               return Promise.resolve(children);
            }*/
         } else {
            let logArr = this.state.getLogs();
            if (logArr) {
               let children = new Array<Dependency>();
               logArr.forEach(name => {
                  const log = this.state.getLog(name);
                  if (log)
                  {
                     const context = log.autoScroll ? 'autoScrollingOn' : 'autoScrollingOff';
                     children.push(new Dependency(log.name, context, vscode.TreeItemCollapsibleState.None, log.uri, { command: 'logs.openFile', title: "Open File", arguments: [log] }, name));
                  }
               });

               return Promise.resolve(children);
            }
         }

         return Promise.resolve([]);
      } catch (err) {
         vscode.window.showErrorMessage(err.toString());
      }
   }

   getTreeItem(element: Dependency): Dependency {
      return element;
   }

   getPlatform(): string | undefined {
      let platform = undefined;
      switch (process.platform) {
         case 'win32':
            platform = 'windows';
            break;
         case 'darwin':
            platform = 'osx';
            break;
         case 'linux':
            platform = 'linux';
            break;    
      }
      return platform;
   }
}