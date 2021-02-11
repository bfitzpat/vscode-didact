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
import { Uri, commands }  from 'vscode';
import { ensureExtensionActivated, validateCommands, getFailedCommands } from './Utils';
import { expect } from 'chai';
import * as extensionFunctions from '../../extensionFunctions';
import { beforeEach } from 'mocha';

suite('Test the demo tutorials', () => {

	const filesToTest : string[] = [
		`demos/markdown/dep-table.didact.md`,
		`demos/markdown/didact-demo.didact.md`,
		`demos/markdown/simple-example.didact.md`,
		`demos/markdown/helloJS/helloJS.didact.md`,
		`demos/markdown/tutorial/tutorial.didact.md`,
		`demos/asciidoc/simple-example.didact.adoc`,
		`demos/asciidoc/didact-demo.didact.adoc`,
		`demos/asciidoc/dep-table.didact.adoc`,
		`create_extension/create-new-tutorial-with-extension.didact.md`
	];

	setup(async () => {
		await ensureExtensionActivated();
	});

	beforeEach(async () => {
		await commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('Walk through the demo files to ensure that all commands exist in the VS Code system', async () => {
		suite('walk through a list of demo files', () => {
			filesToTest.forEach(function(fileToTest: string) {

				beforeEach(async () => {
					await commands.executeCommand('workbench.action.closeAllEditors');
				});
			
				test(`test provided demo file "${fileToTest}"`, async () => {
					const testCommand = Uri.parse(`vscode://redhat.vscode-didact?extension=${fileToTest}`);
					const isOk = await validateCommands(testCommand);
					expect(isOk).to.be.true;
				});
			});
		});
	});

	test('Walk through a tutorial we know has one command that fails due to vscode-java not being loaded', async() => {
		const testCommand = `vscode://redhat.vscode-didact?extension=demos/markdown/camelinaction/chapter1/cia2-chapter-1-v2.didact.md`;
		const isOk = await validateCommands(Uri.parse(testCommand));
		expect(isOk).to.be.false;
		const commands : any[] = extensionFunctions.gatherAllCommandsLinks();
		const failedCommands = await getFailedCommands(commands);
		expect(failedCommands).to.include('java.projectConfiguration.update');
	});

	test('make sure the validation test fails', async () => {
		const testCommand = `vscode://redhat.vscode-didact?extension=demos/markdown/validation-test.didact.md`;
		const isOk = await validateCommands(Uri.parse(testCommand));
		expect(isOk).to.be.false;
	});

});
