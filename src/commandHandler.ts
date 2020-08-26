/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {getValue} from './utils';
import * as url from 'url';
import {extensionFunctions} from './extensionFunctions';
import {isDefaultNotificationDisabled} from './utils';
import { ParsedUrlQuery } from 'querystring';

// take the incoming didact link and allow a mix of a uri and text/user inputs
export async function processInputs(incoming : string, extensionPath? : string) : Promise<void | undefined>  {
	let output : any[] = [];
	if (incoming) {
		extensionFunctions.sendTextToOutputChannel(`Processing command inputs ${incoming} ${extensionPath}`);
		const parsedUrl : url.UrlWithParsedQuery = url.parse(incoming, true);
		const query : ParsedUrlQuery = parsedUrl.query;

		let commandId: string | undefined = undefined;
		let completionMessage : string | undefined = undefined;
		let errorMessage : string | undefined = undefined;

		if (query.commandId) {
			commandId = getValue(query.commandId);
		}
		if (!commandId) {
			throw new Error('No command Id provided');
		} else {

			// handle either a project-based or extension/src-based file path
			if (query.projectFilePath) {
				const projectFilePath : string | undefined = getValue(query.projectFilePath);
				if (projectFilePath) {
					const addUri : vscode.Uri | undefined = handleProjectFilePath(projectFilePath);
					if (addUri) {
						output.push(addUri);
					}
				}
			} else if (query.srcFilePath && extensionPath) {
				const srcFilePath : string | undefined = getValue(query.srcFilePath);
				if (srcFilePath) {
					let addUri : vscode.Uri | undefined = handleSrcFilePath(srcFilePath, extensionPath);
					if (addUri) {
						output.push(addUri);
					}
				}
			} else if (query.extFilePath) {
				const extFilePath : string | undefined = getValue(query.extFilePath);
				if (extFilePath) {
					let addUri : vscode.Uri | undefined = handleExtFilePath(extFilePath);
					if (addUri) {
						output.push(addUri);
					}
				}
			}

			// pass along a URI-encoded string for a completion message to show in an information pop-up
			if (query.completion) {
				completionMessage = getValue(query.completion);
			}

			// pass along a URI-encoded string for an error message to show in an error pop-up should something go wrong
			if (query.error) {
				errorMessage = getValue(query.error);
			}

			// take some text input (i.e. "text=one$$two$$three")
			if (query.text) {
				const text : string | undefined = getValue(query.text);
				if (text) {
					handleText(text, output);
				}
			} else if (query.user) {
				// take some user input (i.e. "user=one$$two$$three")
				// prompt for inputs using the passed-in values as prompts
				const user : string | undefined = getValue(query.user);
				if (user) {
					await handleUser(user, output, errorMessage);
				}
			}
			if (query.number) {
				const text : string | undefined = getValue(query.number);
				if (text) {
					handleNumber(output, text);
				}
			}

			console.log(`commandId : ${commandId}`);
			console.log(`output : ${output.toString()}`);
			// now call the command
			await callCommand(commandId, output, completionMessage, errorMessage);
		}
	}
}

// take a "projectFilePath=" path and make it project-relative to the user workspace
export function handleProjectFilePath(projectFilePath: string) : vscode.Uri | undefined {
	if (vscode.workspace.workspaceFolders === undefined) { 
		return undefined; 
	}
	var workspace : vscode.WorkspaceFolder = vscode.workspace.workspaceFolders[0];
	let rootPath : string = workspace.uri.fsPath;
	let fullpath : string = path.join(rootPath, projectFilePath);
	return vscode.Uri.file(fullpath);
}

// take a "srcFilePath=" path and make it extension-relative to the extension source
function handleSrcFilePath(srcFilePath: string, extensionPath : string) : vscode.Uri | undefined {
	if (extensionPath === undefined) { 
		return undefined; 
	}
	const uri : vscode.Uri = vscode.Uri.file(
		path.join(extensionPath, srcFilePath)
	);
	return uri;
}

// take a "extFilePath=" or "extension=" extId/filepath 
export function handleExtFilePath(extFilePath: string) : vscode.Uri | undefined {
	extensionFunctions.sendTextToOutputChannel(`Processing extension file path input ${extFilePath}`);
	if (extFilePath) {
		const separator : string = '/';
		var array : string[] = extFilePath.split(separator);
		if (array && array.length > 0) {
			let extId : string | undefined = array.shift();
			if (extId) {
				let ext : vscode.Extension<any> | undefined = vscode.extensions.getExtension(extId);
				if (ext) {
					let pathToAdd : string | undefined = array.join(separator);
					let extensionPath : string | undefined = ext.extensionPath;
					extensionFunctions.sendTextToOutputChannel(`-- combining ${pathToAdd} ${extensionPath}`);
					const uri : vscode.Uri = vscode.Uri.file(
						path.join(extensionPath, pathToAdd)
					);
					return uri;
				}
			}
		}
	}
	return undefined;
}

// parse "text=" inputs - exported for testing use
export function handleText(text : string, outputs : string[]) : void {
	if (text) {
		let inputs : string[] = [];
		if (text.split('$$').length > 0) {
			inputs = text.split('$$');
			for(let input of inputs) {
				outputs.push(input);
			}
		} else {
			outputs.push(text);
		}
	}
}

// parse "user=" inputs and then actually prompt for them
async function handleUser(text : string, outputs : string[], errorMessage : string | undefined) : Promise<void> {
	if (text) {
		let inputs : string[] = [];
		if (text.split('$$').length > 0) {
			inputs = text.split('$$');
		} else {
			inputs.push(text);
		}
		try {
			await collectUserInput(inputs).then( async (args: string[]) => {
				for(let arg of args) {
					outputs.push(arg);
				}
			});
		} catch (error) {
			if (errorMessage) {
				vscode.window.showErrorMessage(errorMessage);
			} else {
				vscode.window.showErrorMessage(`Didact was unable to collect user input: ${error}`);
			}
		}
	}
}

// get a single input
async function getUserInput(prompt:string): Promise<string | undefined> {
	return await vscode.window.showInputBox({
		prompt: `Enter a ${prompt}`,
		placeHolder: prompt
	  });		
}

// collect all the inputs
async function collectUserInput(args: string[]) : Promise<string[]> {
	var outArgs : string[] = [];
	for(let prompt of args) {
		let result : string | undefined = await getUserInput(prompt);
		if (result) {
				outArgs.push(result);
		} else {
			throw new Error('Input aborted');
		}
	}
	return outArgs;
}


export function handleNumber(output: any[], text: string) : void {
	output.push(+text);
}

// actually call the command with all the various inputs collected
async function callCommand(commandId: string, args : any[], completionMessage: string | undefined, errorMessage : string | undefined) : Promise<void> {
	try {
		await vscode.commands.executeCommand(commandId, ...args)
			.then( () => {
				if (completionMessage) {
					vscode.window.showInformationMessage(completionMessage);
				} else {
					if (!isDefaultNotificationDisabled()) {
						vscode.window.showInformationMessage(`Didact just executed ${commandId} with arguments ${args}`);
					}
				}
			});
	} catch (error) {
		if (errorMessage) {
			vscode.window.showErrorMessage(errorMessage);
		} else {
			vscode.window.showErrorMessage(`Didact was unable to call command ${commandId}: ${error}`);
		}
	}
}
