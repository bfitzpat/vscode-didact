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
'use strict';

import { expect } from 'chai';
import { SnippetString } from 'vscode';
import { DidactUriCompletionItemProvider, DIDACT_COMMAND_PREFIX } from "../../didactUriCompletionItemProvider";
import { getContext } from '../../extensionFunctions';
import { commands } from 'vscode';

suite("Didact URI completion provider tests", function () {

	const ctx = getContext();
	const provider = new DidactUriCompletionItemProvider(ctx);

	test("that all commands in the didactCompletionCatalog.json are available", async () => {
		const catalog : any = provider.getCompletionCatalog(ctx);
		const vsCommands : string[] = await commands.getCommands(true);
		for (let index = 0; index < catalog.length; index++) {
			const completion = catalog[index];
			const fullCommandId = completion.fullCommandId;
			console.log(`-- ${fullCommandId} is ${vsCommands.includes(fullCommandId)}`);
			expect(vsCommands.includes(fullCommandId)).to.be.true;
		}		
	});

	test("that the didact protocol completion returns with didact://?commandId=", () => {
		const completionItem = provider.didactProtocolCompletion();
		expect(completionItem).to.not.be.null;
		expect(completionItem).to.not.be.undefined;
		expect(completionItem.insertText).to.be.equal(DIDACT_COMMAND_PREFIX);
	});

	test("that the match utility returns expected results for simple didact uri", () => {
		const match = provider.findMatchForCommandVariable('didact://?commandId=vscode.didact.');
		expect(match).to.not.be.null;
		if (match) {
			expect(match[0]).to.not.be.undefined;
			expect(match[0]).to.be.equal('?commandId=vscode.didact.');
			expect(match[1]).to.not.be.undefined;
			expect(match[1]).to.be.equal('vscode.didact.');
		}
	});

	test("that the match utility returns expected results for didact uri with full command and properties", () => {
		const match = provider.findMatchForCommandVariable('didact://?commandId=vscode.didact.closeNamedTerminal&text=NamedTerminal');
		expect(match).to.not.be.null;
		if (match) {
			expect(match[0]).to.not.be.undefined;
			expect(match[0]).to.be.equal('?commandId=vscode.didact.closeNamedTerminal');
			expect(match[1]).to.not.be.undefined;
			expect(match[1]).to.be.equal('vscode.didact.closeNamedTerminal');
		}
	});

	test("that the command processing for a command prefix returns expected results", async () => {
		const match = provider.findMatchForCommandVariable('didact://?commandId=vscode.didact.');
		const completionList = await provider.processCommands(match);
		expect(completionList.items.length).to.be.equal(26);
	});

	test("that the command processing for one command returns one expected result", async () => {
		const match = provider.findMatchForCommandVariable('didact://?commandId=vscode.didact.cliCommandSuccessful&text=cli-requirement-name$$echo%20text');
		const completionList = await provider.processCommands(match);
		expect(completionList.items.length).to.be.equal(1);

		const includeText:string | SnippetString | undefined = completionList.items[0].insertText;
		expect(includeText).to.not.be.undefined;
		expect((includeText as SnippetString).value).to.include('${1:Requirement-Label}');
		expect((includeText as SnippetString).value).to.include('${2:URLEncoded-Command-to-Execute}');
	});

	test("that the didact protocol matcher returns some expected results", () => {
		const validValues : Array<string> = [
			"(didact://?commandId=mycommand)",
			"(didact)",
			"(didact://)",
			"(didact:)",
			"(didact:/",
			"(didact://?",
			"[my link](didact://?comma)",
			"link:didact://?commandId=someCommand",
			"link:didact",
			"(didact://?commandId=vscode.didact.cliCommandSuccessful&text=cli-requirement-name$$echo%20text)"
		];
		const invalidValues : Array<string> = [
			"[dooby](did://?",
			"The man was a didact whiz"
		];
		console.log('testing didact protocol matching against positive results');
		for (let index = 0; index < validValues.length; index++) {
			const match = provider.findMatchForDidactPrefix(validValues[index]);
			expect(match).to.not.be.null;
			expect(match?.length).to.be.equal(1);
		}		
		console.log('testing didact protocol matching against negative results');
		for (let index = 0; index < invalidValues.length; index++) {
			const match = provider.findMatchForDidactPrefix(invalidValues[index]);
			expect(match).to.be.null;
			expect(match?.length).to.be.undefined;
		}
	});

});
