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
import * as MarkdownIt from 'markdown-it';

// set up and return the markdown parser
export function getMDParser() : MarkdownIt {
	const md = new MarkdownIt({html: true});
	const taskLists = require('markdown-it-task-lists');
	const markdownItAttrs = require('markdown-it-attrs');
	const parser = md
		.set({ typographer: true })
		.set({ linkify: true })
		.enable('linkify')
		.enable('replacements')
		.enable('strikethrough')
		.enable('table')
		.use(taskLists, {enabled: true, label: true})
		.use(markdownItAttrs, {});
	return parser;
}

export function parseMDtoHTML(content: string) : string {
	const htmlContent = getMDParser().render(content);
	return cleanupTaskListItemCheckbox(htmlContent);
}

// brute force approach to handling https://issues.redhat.com/browse/FUSETOOLS2-879
function cleanupTaskListItemCheckbox(content: string) : string {
	const firstStrToReplace = /<input class="task-list-item-checkbox"type="checkbox">/g;
	const firstReplaceString = `<input class="task-list-item-checkbox" type="checkbox">`;
	const cleanedContent = content.replace(firstStrToReplace, firstReplaceString);

	const secondStrToReplace = /<input class="task-list-item-checkbox" checked=""type="checkbox">/g;
	const secondReplaceString = `<input class="task-list-item-checkbox" checked="" type="checkbox">`;
	return cleanedContent.replace(secondStrToReplace, secondReplaceString);
}
