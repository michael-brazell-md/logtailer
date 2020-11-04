import * as vscode from 'vscode';
import * as logs from './logs';

//namespace scriptastic {

export class State {

   public workspaceConfig: vscode.WorkspaceConfiguration;

   constructor(private context: vscode.ExtensionContext) {
      this.workspaceConfig = vscode.workspace.getConfiguration('scriptastic');
   }

   // logs
   getLogs(): Array<string> {
      return this.context.workspaceState.get('logs') as Array<string> || new Array<string>();
   }

   setLogs(logArr: Array<string>) {
      this.context.workspaceState.update('logs', logArr);
   }

   addLog(log: logs.Log) {
      let logArr = this.getLogs();
      if (!logArr.find(n => n === log.name)) {
         logArr.push(log.name);
         this.context.workspaceState.update('logs', logArr);
      }
      this.updateLog(log);
   }

   remLog(name: string): boolean {
      let logArr = this.getLogs();
      let log = logArr.find(n => n === name);
      if (log) {
         logArr.splice(logArr.indexOf(log), 1);
         this.context.workspaceState.update('logs', logArr);
         this.context.workspaceState.update(name, undefined);
         return true;
      }
      return false; // not found
   }

   getLog(name?: string): logs.Log | undefined {
      if (name) {
         return this.context.workspaceState.get(name);
      }
      return undefined;
   }

   updateLog(log: logs.Log) {
      this.context.workspaceState.update(log.name, log);
   }

   getConfigurationPropertyAsString(name: string, platform?: string): string | undefined {
      const property = this.workspaceConfig.inspect(name + (platform !== undefined ? ('.' + platform) : ''));
      if (property) {
         const globalValue = property.globalValue as string;
         if (globalValue !== undefined) {
            return globalValue;
         }
         const workspaceValue = property.workspaceValue as string;
         if (workspaceValue !== undefined) {
            return workspaceValue;
         }
         const defaultValue = property.defaultValue as string;
         if (defaultValue !== undefined) {
            return defaultValue;
         }
      }
      return undefined;
   }
}

//}