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

import { expect } from 'chai';
import { window, commands, env, Uri, Terminal, Pseudoterminal, Event, TerminalDimensions, EventEmitter } from 'vscode';
import { START_DIDACT_COMMAND, sendTerminalText, gatherAllCommandsLinks, getContext, findTerminal } from '../../extensionFunctions';
import { didactManager } from '../../didactManager';
import { DidactUri } from '../../didactUri';
import { handleText } from '../../commandHandler';

const testMD = Uri.parse('vscode://redhat.vscode-didact?extension=demos/markdown/didact-demo.didact.md');

const delayTime = 1000;

suite('stub out a tutorial', () => {

	test('that we can send an echo command to the terminal and get the response', async () => {
		const name = 'echoTerminal';
		const text = `echo Hello World ${name}`;
		const result = `Hello World echoTerminal`;
		await validateTerminalResponse(name, text, result);
	});

	test('that we can get a response from each command in the demo tutorial', async () => {
		await commands.executeCommand(START_DIDACT_COMMAND, testMD).then( async () => {
			if (didactManager.active()) {

				suite('walk through all the sendNamedTerminalAString commands in the demo', () => {
					const commands : any[] = gatherAllCommandsLinks().filter( (href) => href.match(/=vscode.didact.sendNamedTerminalAString&/g));
					expect(commands).to.not.be.empty;
					commands.forEach(function(href: string) {
						test(`test terminal command "${href}"`, async () => {
							const ctxt = getContext();
							if (ctxt) {
								const testUri = new DidactUri(href, ctxt);
								const textToParse = testUri.getText();
								const userToParse = testUri.getUser();
								let outputs : string[] = [];
								if (textToParse) {
									handleText(textToParse, outputs);
								} else if (userToParse) {
									handleText(userToParse, outputs);
								}
								expect(outputs).length.to.be.at.least(2);
								const terminalName = outputs[0];
								const terminalString = outputs[1];
								await validateSimpleTerminalResponse(terminalName, terminalString);
							}
						});
					});
				});				
			}
		});
	});

});

async function validateSimpleTerminalResponse(terminalName : string, terminalText : string) {
	console.log(`validateSimpleTerminalResponse terminal ${terminalName} executing text ${terminalText}`);
	const term = window.createTerminal(terminalName);
	expect(term).to.not.be.null;
	if (term) {
		console.log(`-current terminal = ${term?.name}`);
		await sendTerminalText(terminalName, terminalText);
		await delay(delayTime);
		const term2 = focusOnNamedTerminal(terminalName);
		await delay(delayTime);
		let result = await getTerminalOutput(terminalName);
		console.log(`-validateSimpleTerminalResponse terminal output = ${result}`);

		// we're just making sure we get something back and can see the text we put into the terminal
		expect(result).to.include(terminalText);
		findAndDisposeTerminal(terminalName);
	}
}

async function validateTerminalResponse(terminalName : string, terminalText : string, terminalResponse : string) {
	console.log(`validateTerminalResponse terminal ${terminalName} executing text ${terminalText} and looking for response ${terminalResponse}`);
	const term = window.createTerminal(terminalName);
	expect(term).to.not.be.null;
	if (term) {
		console.log(`-current terminal = ${term?.name}`);
		await sendTerminalText(terminalName, terminalText);
		await delay(delayTime);
		const term2 = focusOnNamedTerminal(terminalName);
		await delay(delayTime);
		let result = await getTerminalOutput(terminalName);
		console.log(`-validateTerminalResponse terminal output = ${result}`);
		expect(result).to.include(terminalResponse);
		findAndDisposeTerminal(terminalName);
	}
}

async function getTerminalOutput(terminalName : string) : Promise<string> {
	const terminal = getNamedTerminal(terminalName);
	expect(terminal).to.not.be.undefined;
	expect(terminal?.name).to.equal(terminalName);
	focusOnNamedTerminal(terminalName);
	const term = window.activeTerminal;
	console.log(`-current terminal = ${term?.name}`);
	await executeAndWait('workbench.action.terminal.selectAll');
	await delay(delayTime);
	await executeAndWait('workbench.action.terminal.copySelection');
	await executeAndWait('workbench.action.terminal.clearSelection');	
	const clipboard_content = await env.clipboard.readText();
	return clipboard_content.trim();;
}

function delay(ms: number) {
	return new Promise( resolve => setTimeout(resolve, ms) );
}

async function executeAndWait(command: string): Promise<void> {
	await commands.executeCommand(command);
	delay(100);
}

function getNamedTerminal(terminalName : string): Terminal | undefined {
	return window.terminals.filter(term => term.name === terminalName)[0];
}

function findAndDisposeTerminal(terminalName: string) : void {
	const term = getNamedTerminal(terminalName);
	if (term) {
		term.dispose();
	}
}

async function focusOnNamedTerminal(terminalName : string) : Promise<void> {
	let term = window.activeTerminal;
	while (term?.name != terminalName) {
		await commands.executeCommand('workbench.action.terminal.focusNext');
		term = window.activeTerminal;
	}
}
