var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./typeAcquisition", "./theme", "./compilerOptions", "./vendor/lzstring.min", "./releases", "./getInitialCode", "./twoslashSupport", "./vendor/typescript-vfs"], function (require, exports, typeAcquisition_1, theme_1, compilerOptions_1, lzstring_min_1, releases_1, getInitialCode_1, twoslashSupport_1, tsvfs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createTypeScriptSandbox = exports.defaultPlaygroundSettings = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    tsvfs = __importStar(tsvfs);
    const languageType = (config) => (config.filetype === "js" ? "javascript" : "typescript");
    // Basically android and monaco is pretty bad, this makes it less bad
    // See https://github.com/microsoft/pxt/pull/7099 for this, and the long
    // read is in https://github.com/microsoft/monaco-editor/issues/563
    const isAndroid = navigator && /android/i.test(navigator.userAgent);
    /** Default Monaco settings for playground */
    const sharedEditorOptions = {
        scrollBeyondLastLine: true,
        scrollBeyondLastColumn: 3,
        minimap: {
            enabled: false,
        },
        lightbulb: {
            enabled: true,
        },
        quickSuggestions: {
            other: !isAndroid,
            comments: !isAndroid,
            strings: !isAndroid,
        },
        acceptSuggestionOnCommitCharacter: !isAndroid,
        acceptSuggestionOnEnter: !isAndroid ? "on" : "off",
        accessibilitySupport: !isAndroid ? "on" : "off",
    };
    /** The default settings which we apply a partial over */
    function defaultPlaygroundSettings() {
        const config = {
            text: "",
            domID: "",
            compilerOptions: {},
            acquireTypes: true,
            filetype: "ts",
            supportTwoslashCompilerOptions: false,
            logger: console,
        };
        return config;
    }
    exports.defaultPlaygroundSettings = defaultPlaygroundSettings;
    function defaultFilePath(config, compilerOptions, monaco) {
        const isJSX = compilerOptions.jsx !== monaco.languages.typescript.JsxEmit.None;
        const ext = isJSX && config.filetype !== "d.ts" ? config.filetype + "x" : config.filetype;
        return "input." + ext;
    }
    /** Creates a monaco file reference, basically a fancy path */
    function createFileUri(config, compilerOptions, monaco) {
        return monaco.Uri.file(defaultFilePath(config, compilerOptions, monaco));
    }
    /** Creates a sandbox editor, and returns a set of useful functions and the editor */
    const createTypeScriptSandbox = (partialConfig, monaco, ts) => {
        const config = Object.assign(Object.assign({}, defaultPlaygroundSettings()), partialConfig);
        if (!("domID" in config) && !("elementToAppend" in config))
            throw new Error("You did not provide a domID or elementToAppend");
        const defaultText = config.suppressAutomaticallyGettingDefaultText
            ? config.text
            : (0, getInitialCode_1.getInitialCode)(config.text, document.location);
        // Defaults
        const compilerDefaults = (0, compilerOptions_1.getDefaultSandboxCompilerOptions)(config, monaco);
        // Grab the compiler flags via the query params
        let compilerOptions;
        if (!config.suppressAutomaticallyGettingCompilerFlags) {
            const params = new URLSearchParams(location.search);
            let queryParamCompilerOptions = (0, compilerOptions_1.getCompilerOptionsFromParams)(compilerDefaults, ts, params);
            if (Object.keys(queryParamCompilerOptions).length)
                config.logger.log("[Compiler] Found compiler options in query params: ", queryParamCompilerOptions);
            compilerOptions = Object.assign(Object.assign({}, compilerDefaults), queryParamCompilerOptions);
        }
        else {
            compilerOptions = compilerDefaults;
        }
        const isJSLang = config.filetype === "js";
        // Don't allow a state like allowJs = false
        if (isJSLang) {
            compilerOptions.allowJs = true;
        }
        const language = languageType(config);
        const filePath = createFileUri(config, compilerOptions, monaco);
        const element = "domID" in config ? document.getElementById(config.domID) : config.elementToAppend;
        const model = monaco.editor.createModel(defaultText, language, filePath);
        monaco.editor.defineTheme("sandbox", theme_1.sandboxTheme);
        monaco.editor.defineTheme("sandbox-dark", theme_1.sandboxThemeDark);
        monaco.editor.setTheme("sandbox");
        const monacoSettings = Object.assign({ model }, sharedEditorOptions, config.monacoSettings || {});
        const editor = monaco.editor.create(element, monacoSettings);
        const getWorker = isJSLang
            ? monaco.languages.typescript.getJavaScriptWorker
            : monaco.languages.typescript.getTypeScriptWorker;
        const defaults = isJSLang
            ? monaco.languages.typescript.javascriptDefaults
            : monaco.languages.typescript.typescriptDefaults;
        defaults.setDiagnosticsOptions(Object.assign(Object.assign({}, defaults.getDiagnosticsOptions()), { noSemanticValidation: false, 
            // This is when tslib is not found
            diagnosticCodesToIgnore: [2354] }));
        // In the future it'd be good to add support for an 'add many files'
        const addLibraryToRuntime = (code, path) => {
            defaults.addExtraLib(code, path);
            const uri = monaco.Uri.file(path);
            if (monaco.editor.getModel(uri) === null) {
                monaco.editor.createModel(code, "javascript", uri);
            }
            config.logger.log(`[ATA] Adding ${path} to runtime`);
        };
        const getTwoSlashCompilerOptions = (0, twoslashSupport_1.extractTwoSlashCompilerOptions)(ts);
        // Auto-complete twoslash comments
        if (config.supportTwoslashCompilerOptions) {
            const langs = ["javascript", "typescript"];
            langs.forEach(l => monaco.languages.registerCompletionItemProvider(l, {
                triggerCharacters: ["@", "/", "-"],
                provideCompletionItems: (0, twoslashSupport_1.twoslashCompletions)(ts, monaco),
            }));
        }
        const textUpdated = () => {
            const code = editor.getModel().getValue();
            if (config.supportTwoslashCompilerOptions) {
                const configOpts = getTwoSlashCompilerOptions(code);
                updateCompilerSettings(configOpts);
            }
            if (config.acquireTypes) {
                (0, typeAcquisition_1.detectNewImportsToAcquireTypeFor)(code, addLibraryToRuntime, window.fetch.bind(window), config);
            }
        };
        // Debounced sandbox features like twoslash and type acquisition to once every second
        let debouncingTimer = false;
        editor.onDidChangeModelContent(_e => {
            if (debouncingTimer)
                return;
            debouncingTimer = true;
            setTimeout(() => {
                debouncingTimer = false;
                textUpdated();
            }, 1000);
        });
        config.logger.log("[Compiler] Set compiler options: ", compilerOptions);
        defaults.setCompilerOptions(compilerOptions);
        // To let clients plug into compiler settings changes
        let didUpdateCompilerSettings = (opts) => { };
        const updateCompilerSettings = (opts) => {
            const newKeys = Object.keys(opts);
            if (!newKeys.length)
                return;
            // Don't update a compiler setting if it's the same
            // as the current setting
            newKeys.forEach(key => {
                if (compilerOptions[key] == opts[key])
                    delete opts[key];
            });
            if (!Object.keys(opts).length)
                return;
            config.logger.log("[Compiler] Updating compiler options: ", opts);
            compilerOptions = Object.assign(Object.assign({}, compilerOptions), opts);
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const updateCompilerSetting = (key, value) => {
            config.logger.log("[Compiler] Setting compiler options ", key, "to", value);
            compilerOptions[key] = value;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const setCompilerSettings = (opts) => {
            config.logger.log("[Compiler] Setting compiler options: ", opts);
            compilerOptions = opts;
            defaults.setCompilerOptions(compilerOptions);
            didUpdateCompilerSettings(compilerOptions);
        };
        const getCompilerOptions = () => {
            return compilerOptions;
        };
        const setDidUpdateCompilerSettings = (func) => {
            didUpdateCompilerSettings = func;
        };
        /** Gets the results of compiling your editor's code */
        const getEmitResult = () => __awaiter(void 0, void 0, void 0, function* () {
            const model = editor.getModel();
            const client = yield getWorkerProcess();
            return yield client.getEmitOutput(model.uri.toString());
        });
        /** Gets the JS  of compiling your editor's code */
        const getRunnableJS = () => __awaiter(void 0, void 0, void 0, function* () {
            // This isn't quite _right_ in theory, we can downlevel JS -> JS
            // but a browser is basically always esnext-y and setting allowJs and
            // checkJs does not actually give the downlevel'd .js file in the output
            // later down the line.
            if (isJSLang) {
                return getText();
            }
            const result = yield getEmitResult();
            const firstJS = result.outputFiles.find((o) => o.name.endsWith(".js") || o.name.endsWith(".jsx"));
            return (firstJS && firstJS.text) || "";
        });
        /** Gets the DTS for the JS/TS  of compiling your editor's code */
        const getDTSForCode = () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield getEmitResult();
            return result.outputFiles.find((o) => o.name.endsWith(".d.ts")).text;
        });
        const getWorkerProcess = () => __awaiter(void 0, void 0, void 0, function* () {
            const worker = yield getWorker();
            // @ts-ignore
            return yield worker(model.uri);
        });
        const getDomNode = () => editor.getDomNode();
        const getModel = () => editor.getModel();
        const getText = () => getModel().getValue();
        const setText = (text) => getModel().setValue(text);
        const setupTSVFS = (fsMapAdditions) => __awaiter(void 0, void 0, void 0, function* () {
            const fsMap = yield tsvfs.createDefaultMapFromCDN(compilerOptions, ts.version, true, ts, lzstring_min_1.default);
            fsMap.set(filePath.path, getText());
            if (fsMapAdditions) {
                fsMapAdditions.forEach((v, k) => fsMap.set(k, v));
            }
            const system = tsvfs.createSystem(fsMap);
            const host = tsvfs.createVirtualCompilerHost(system, compilerOptions, ts);
            const program = ts.createProgram({
                rootNames: [...fsMap.keys()],
                options: compilerOptions,
                host: host.compilerHost,
            });
            return {
                program,
                system,
                host,
                fsMap,
            };
        });
        /**
         * Creates a TS Program, if you're doing anything complex
         * it's likely you want setupTSVFS instead and can pull program out from that
         *
         * Warning: Runs on the main thread
         */
        const createTSProgram = () => __awaiter(void 0, void 0, void 0, function* () {
            const tsvfs = yield setupTSVFS();
            return tsvfs.program;
        });
        const getAST = () => __awaiter(void 0, void 0, void 0, function* () {
            const program = yield createTSProgram();
            program.emit();
            return program.getSourceFile(filePath.path);
        });
        // Pass along the supported releases for the playground
        const supportedVersions = releases_1.supportedReleases;
        textUpdated();
        return {
            /** The same config you passed in */
            config,
            /** A list of TypeScript versions you can use with the TypeScript sandbox */
            supportedVersions,
            /** The monaco editor instance */
            editor,
            /** Either "typescript" or "javascript" depending on your config */
            language,
            /** The outer monaco module, the result of require("monaco-editor")  */
            monaco,
            /** Gets a monaco-typescript worker, this will give you access to a language server. Note: prefer this for language server work because it happens on a webworker . */
            getWorkerProcess,
            /** A copy of require("@typescript/vfs") this can be used to quickly set up an in-memory compiler runs for ASTs, or to get complex language server results (anything above has to be serialized when passed)*/
            tsvfs,
            /** Get all the different emitted files after TypeScript is run */
            getEmitResult,
            /** Gets just the JavaScript for your sandbox, will transpile if in TS only */
            getRunnableJS,
            /** Gets the DTS output of the main code in the editor */
            getDTSForCode,
            /** The monaco-editor dom node, used for showing/hiding the editor */
            getDomNode,
            /** The model is an object which monaco uses to keep track of text in the editor. Use this to directly modify the text in the editor */
            getModel,
            /** Gets the text of the main model, which is the text in the editor */
            getText,
            /** Shortcut for setting the model's text content which would update the editor */
            setText,
            /** Gets the AST of the current text in monaco - uses `createTSProgram`, so the performance caveat applies there too */
            getAST,
            /** The module you get from require("typescript") */
            ts,
            /** Create a new Program, a TypeScript data model which represents the entire project. As well as some of the
             * primitive objects you would normally need to do work with the files.
             *
             * The first time this is called it has to download all the DTS files which is needed for an exact compiler run. Which
             * at max is about 1.5MB - after that subsequent downloads of dts lib files come from localStorage.
             *
             * Try to use this sparingly as it can be computationally expensive, at the minimum you should be using the debounced setup.
             *
             * Accepts an optional fsMap which you can use to add any files, or overwrite the default file.
             *
             * TODO: It would be good to create an easy way to have a single program instance which is updated for you
             * when the monaco model changes.
             */
            setupTSVFS,
            /** Uses the above call setupTSVFS, but only returns the program */
            createTSProgram,
            /** The Sandbox's default compiler options  */
            compilerDefaults,
            /** The Sandbox's current compiler options */
            getCompilerOptions,
            /** Replace the Sandbox's compiler options */
            setCompilerSettings,
            /** Overwrite the Sandbox's compiler options */
            updateCompilerSetting,
            /** Update a single compiler option in the SAndbox */
            updateCompilerSettings,
            /** A way to get callbacks when compiler settings have changed */
            setDidUpdateCompilerSettings,
            /** A copy of lzstring, which is used to archive/unarchive code */
            lzstring: lzstring_min_1.default,
            /** Returns compiler options found in the params of the current page */
            createURLQueryWithCompilerOptions: compilerOptions_1.createURLQueryWithCompilerOptions,
            /**
             * @deprecated Use `getTwoSlashCompilerOptions` instead.
             *
             * Returns compiler options in the source code using twoslash notation
             */
            getTwoSlashComplierOptions: getTwoSlashCompilerOptions,
            /** Returns compiler options in the source code using twoslash notation */
            getTwoSlashCompilerOptions,
            /** Gets to the current monaco-language, this is how you talk to the background webworkers */
            languageServiceDefaults: defaults,
            /** The path which represents the current file using the current compiler options */
            filepath: filePath.path,
            /** Adds a file to the vfs used by the editor */
            addLibraryToRuntime,
        };
    };
    exports.createTypeScriptSandbox = createTypeScriptSandbox;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zYW5kYm94L3NyYy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBb0RBLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBcUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUV4RyxxRUFBcUU7SUFDckUsd0VBQXdFO0lBQ3hFLG1FQUFtRTtJQUNuRSxNQUFNLFNBQVMsR0FBRyxTQUFTLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUE7SUFFbkUsNkNBQTZDO0lBQzdDLE1BQU0sbUJBQW1CLEdBQWtEO1FBQ3pFLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztRQUN6QixPQUFPLEVBQUU7WUFDUCxPQUFPLEVBQUUsS0FBSztTQUNmO1FBQ0QsU0FBUyxFQUFFO1lBQ1QsT0FBTyxFQUFFLElBQUk7U0FDZDtRQUNELGdCQUFnQixFQUFFO1lBQ2hCLEtBQUssRUFBRSxDQUFDLFNBQVM7WUFDakIsUUFBUSxFQUFFLENBQUMsU0FBUztZQUNwQixPQUFPLEVBQUUsQ0FBQyxTQUFTO1NBQ3BCO1FBQ0QsaUNBQWlDLEVBQUUsQ0FBQyxTQUFTO1FBQzdDLHVCQUF1QixFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7UUFDbEQsb0JBQW9CLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSztLQUNoRCxDQUFBO0lBRUQseURBQXlEO0lBQ3pELFNBQWdCLHlCQUF5QjtRQUN2QyxNQUFNLE1BQU0sR0FBa0I7WUFDNUIsSUFBSSxF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QWlCO1lBQ2pCLGlDQUFpQztZQUNqQyxNQUFNO1lBQ04sbUVBQW1FO1lBQ25FLFFBQVE7WUFDUix1RUFBdUU7WUFDdkUsTUFBTTtZQUNOLHNLQUFzSztZQUN0SyxnQkFBZ0I7WUFDaEIsOE1BQThNO1lBQzlNLEtBQUs7WUFDTCxrRUFBa0U7WUFDbEUsYUFBYTtZQUNiLDhFQUE4RTtZQUM5RSxhQUFhO1lBQ2IseURBQXlEO1lBQ3pELGFBQWE7WUFDYixxRUFBcUU7WUFDckUsVUFBVTtZQUNWLHVJQUF1STtZQUN2SSxRQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLE9BQU87WUFDUCxrRkFBa0Y7WUFDbEYsT0FBTztZQUNQLHVIQUF1SDtZQUN2SCxNQUFNO1lBQ04sb0RBQW9EO1lBQ3BELEVBQUU7WUFDRjs7Ozs7Ozs7Ozs7O2VBWUc7WUFDSCxVQUFVO1lBQ1YsbUVBQW1FO1lBQ25FLGVBQWU7WUFDZiw4Q0FBOEM7WUFDOUMsZ0JBQWdCO1lBQ2hCLDZDQUE2QztZQUM3QyxrQkFBa0I7WUFDbEIsNkNBQTZDO1lBQzdDLG1CQUFtQjtZQUNuQiwrQ0FBK0M7WUFDL0MscUJBQXFCO1lBQ3JCLHFEQUFxRDtZQUNyRCxzQkFBc0I7WUFDdEIsaUVBQWlFO1lBQ2pFLDRCQUE0QjtZQUM1QixrRUFBa0U7WUFDbEUsUUFBUSxFQUFSLHNCQUFRO1lBQ1IsdUVBQXVFO1lBQ3ZFLGlDQUFpQyxFQUFqQyxtREFBaUM7WUFDakM7Ozs7ZUFJRztZQUNILDBCQUEwQixFQUFFLDBCQUEwQjtZQUN0RCwwRUFBMEU7WUFDMUUsMEJBQTBCO1lBQzFCLDZGQUE2RjtZQUM3Rix1QkFBdUIsRUFBRSxRQUFRO1lBQ2pDLG9GQUFvRjtZQUNwRixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDdkIsZ0RBQWdEO1lBQ2hELG1CQUFtQjtTQUNwQixDQUFBO0lBQ0gsQ0FBQyxDQUFBO0lBL1RZLFFBQUEsdUJBQXVCLDJCQStUbkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZXRlY3ROZXdJbXBvcnRzVG9BY3F1aXJlVHlwZUZvciB9IGZyb20gXCIuL3R5cGVBY3F1aXNpdGlvblwiXG5pbXBvcnQgeyBzYW5kYm94VGhlbWUsIHNhbmRib3hUaGVtZURhcmsgfSBmcm9tIFwiLi90aGVtZVwiXG5pbXBvcnQgeyBUeXBlU2NyaXB0V29ya2VyIH0gZnJvbSBcIi4vdHNXb3JrZXJcIlxuaW1wb3J0IHtcbiAgZ2V0RGVmYXVsdFNhbmRib3hDb21waWxlck9wdGlvbnMsXG4gIGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMsXG4gIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbn0gZnJvbSBcIi4vY29tcGlsZXJPcHRpb25zXCJcbmltcG9ydCBsenN0cmluZyBmcm9tIFwiLi92ZW5kb3IvbHpzdHJpbmcubWluXCJcbmltcG9ydCB7IHN1cHBvcnRlZFJlbGVhc2VzIH0gZnJvbSBcIi4vcmVsZWFzZXNcIlxuaW1wb3J0IHsgZ2V0SW5pdGlhbENvZGUgfSBmcm9tIFwiLi9nZXRJbml0aWFsQ29kZVwiXG5pbXBvcnQgeyBleHRyYWN0VHdvU2xhc2hDb21waWxlck9wdGlvbnMsIHR3b3NsYXNoQ29tcGxldGlvbnMgfSBmcm9tIFwiLi90d29zbGFzaFN1cHBvcnRcIlxuaW1wb3J0ICogYXMgdHN2ZnMgZnJvbSBcIi4vdmVuZG9yL3R5cGVzY3JpcHQtdmZzXCJcblxudHlwZSBDb21waWxlck9wdGlvbnMgPSBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmxhbmd1YWdlcy50eXBlc2NyaXB0LkNvbXBpbGVyT3B0aW9uc1xudHlwZSBNb25hY28gPSB0eXBlb2YgaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKVxuXG4vKipcbiAqIFRoZXNlIGFyZSBzZXR0aW5ncyBmb3IgdGhlIHBsYXlncm91bmQgd2hpY2ggYXJlIHRoZSBlcXVpdmFsZW50IHRvIHByb3BzIGluIFJlYWN0XG4gKiBhbnkgY2hhbmdlcyB0byBpdCBzaG91bGQgcmVxdWlyZSBhIG5ldyBzZXR1cCBvZiB0aGUgcGxheWdyb3VuZFxuICovXG5leHBvcnQgdHlwZSBTYW5kYm94Q29uZmlnID0ge1xuICAvKiogVGhlIGRlZmF1bHQgc291cmNlIGNvZGUgZm9yIHRoZSBwbGF5Z3JvdW5kICovXG4gIHRleHQ6IHN0cmluZ1xuICAvKiogQGRlcHJlY2F0ZWQgKi9cbiAgdXNlSmF2YVNjcmlwdD86IGJvb2xlYW5cbiAgLyoqIFRoZSBkZWZhdWx0IGZpbGUgZm9yIHRoZSBwbGFheWdyb3VuZCAgKi9cbiAgZmlsZXR5cGU6IFwianNcIiB8IFwidHNcIiB8IFwiZC50c1wiXG4gIC8qKiBDb21waWxlciBvcHRpb25zIHdoaWNoIGFyZSBhdXRvbWF0aWNhbGx5IGp1c3QgZm9yd2FyZGVkIG9uICovXG4gIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zXG4gIC8qKiBPcHRpb25hbCBtb25hY28gc2V0dGluZ3Mgb3ZlcnJpZGVzICovXG4gIG1vbmFjb1NldHRpbmdzPzogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5lZGl0b3IuSUVkaXRvck9wdGlvbnNcbiAgLyoqIEFjcXVpcmUgdHlwZXMgdmlhIHR5cGUgYWNxdWlzaXRpb24gKi9cbiAgYWNxdWlyZVR5cGVzOiBib29sZWFuXG4gIC8qKiBTdXBwb3J0IHR3b3NsYXNoIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBib29sZWFuXG4gIC8qKiBHZXQgdGhlIHRleHQgdmlhIHF1ZXJ5IHBhcmFtcyBhbmQgbG9jYWwgc3RvcmFnZSwgdXNlZnVsIHdoZW4gdGhlIGVkaXRvciBpcyB0aGUgbWFpbiBleHBlcmllbmNlICovXG4gIHN1cHByZXNzQXV0b21hdGljYWxseUdldHRpbmdEZWZhdWx0VGV4dD86IHRydWVcbiAgLyoqIFN1cHByZXNzIHNldHRpbmcgY29tcGlsZXIgb3B0aW9ucyBmcm9tIHRoZSBjb21waWxlciBmbGFncyBmcm9tIHF1ZXJ5IHBhcmFtcyAqL1xuICBzdXBwcmVzc0F1dG9tYXRpY2FsbHlHZXR0aW5nQ29tcGlsZXJGbGFncz86IHRydWVcbiAgLyoqIExvZ2dpbmcgc3lzdGVtICovXG4gIGxvZ2dlcjoge1xuICAgIGxvZzogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gICAgZXJyb3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gdm9pZFxuICAgIGdyb3VwQ29sbGFwc2VkOiAoLi4uYXJnczogYW55W10pID0+IHZvaWRcbiAgICBncm91cEVuZDogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkXG4gIH1cbn0gJiAoXG4gICAgfCB7IC8qKiB0aGVJRCBvZiBhIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZG9tSUQ6IHN0cmluZyB9XG4gICAgfCB7IC8qKiB0aGVJRCBvZiBhIGRvbSBub2RlIHRvIGFkZCBtb25hY28gdG8gKi8gZWxlbWVudFRvQXBwZW5kOiBIVE1MRWxlbWVudCB9XG4gIClcblxuY29uc3QgbGFuZ3VhZ2VUeXBlID0gKGNvbmZpZzogU2FuZGJveENvbmZpZykgPT4gKGNvbmZpZy5maWxldHlwZSA9PT0gXCJqc1wiID8gXCJqYXZhc2NyaXB0XCIgOiBcInR5cGVzY3JpcHRcIilcblxuLy8gQmFzaWNhbGx5IGFuZHJvaWQgYW5kIG1vbmFjbyBpcyBwcmV0dHkgYmFkLCB0aGlzIG1ha2VzIGl0IGxlc3MgYmFkXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9weHQvcHVsbC83MDk5IGZvciB0aGlzLCBhbmQgdGhlIGxvbmdcbi8vIHJlYWQgaXMgaW4gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9tb25hY28tZWRpdG9yL2lzc3Vlcy81NjNcbmNvbnN0IGlzQW5kcm9pZCA9IG5hdmlnYXRvciAmJiAvYW5kcm9pZC9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudClcblxuLyoqIERlZmF1bHQgTW9uYWNvIHNldHRpbmdzIGZvciBwbGF5Z3JvdW5kICovXG5jb25zdCBzaGFyZWRFZGl0b3JPcHRpb25zOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JRWRpdG9yT3B0aW9ucyA9IHtcbiAgc2Nyb2xsQmV5b25kTGFzdExpbmU6IHRydWUsXG4gIHNjcm9sbEJleW9uZExhc3RDb2x1bW46IDMsXG4gIG1pbmltYXA6IHtcbiAgICBlbmFibGVkOiBmYWxzZSxcbiAgfSxcbiAgbGlnaHRidWxiOiB7XG4gICAgZW5hYmxlZDogdHJ1ZSxcbiAgfSxcbiAgcXVpY2tTdWdnZXN0aW9uczoge1xuICAgIG90aGVyOiAhaXNBbmRyb2lkLFxuICAgIGNvbW1lbnRzOiAhaXNBbmRyb2lkLFxuICAgIHN0cmluZ3M6ICFpc0FuZHJvaWQsXG4gIH0sXG4gIGFjY2VwdFN1Z2dlc3Rpb25PbkNvbW1pdENoYXJhY3RlcjogIWlzQW5kcm9pZCxcbiAgYWNjZXB0U3VnZ2VzdGlvbk9uRW50ZXI6ICFpc0FuZHJvaWQgPyBcIm9uXCIgOiBcIm9mZlwiLFxuICBhY2Nlc3NpYmlsaXR5U3VwcG9ydDogIWlzQW5kcm9pZCA/IFwib25cIiA6IFwib2ZmXCIsXG59XG5cbi8qKiBUaGUgZGVmYXVsdCBzZXR0aW5ncyB3aGljaCB3ZSBhcHBseSBhIHBhcnRpYWwgb3ZlciAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRQbGF5Z3JvdW5kU2V0dGluZ3MoKSB7XG4gIGNvbnN0IGNvbmZpZzogU2FuZGJveENvbmZpZyA9IHtcbiAgICB0ZXh0OiBcIlwiLFxuICAgIGRvbUlEOiBcIlwiLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge30sXG4gICAgYWNxdWlyZVR5cGVzOiB0cnVlLFxuICAgIGZpbGV0eXBlOiBcInRzXCIsXG4gICAgc3VwcG9ydFR3b3NsYXNoQ29tcGlsZXJPcHRpb25zOiBmYWxzZSxcbiAgICBsb2dnZXI6IGNvbnNvbGUsXG4gIH1cbiAgcmV0dXJuIGNvbmZpZ1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0RmlsZVBhdGgoY29uZmlnOiBTYW5kYm94Q29uZmlnLCBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucywgbW9uYWNvOiBNb25hY28pIHtcbiAgY29uc3QgaXNKU1ggPSBjb21waWxlck9wdGlvbnMuanN4ICE9PSBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuSnN4RW1pdC5Ob25lXG4gIGNvbnN0IGV4dCA9IGlzSlNYICYmIGNvbmZpZy5maWxldHlwZSAhPT0gXCJkLnRzXCIgPyBjb25maWcuZmlsZXR5cGUgKyBcInhcIiA6IGNvbmZpZy5maWxldHlwZVxuICByZXR1cm4gXCJpbnB1dC5cIiArIGV4dFxufVxuXG4vKiogQ3JlYXRlcyBhIG1vbmFjbyBmaWxlIHJlZmVyZW5jZSwgYmFzaWNhbGx5IGEgZmFuY3kgcGF0aCAqL1xuZnVuY3Rpb24gY3JlYXRlRmlsZVVyaShjb25maWc6IFNhbmRib3hDb25maWcsIGNvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zLCBtb25hY286IE1vbmFjbykge1xuICByZXR1cm4gbW9uYWNvLlVyaS5maWxlKGRlZmF1bHRGaWxlUGF0aChjb25maWcsIGNvbXBpbGVyT3B0aW9ucywgbW9uYWNvKSlcbn1cblxuLyoqIENyZWF0ZXMgYSBzYW5kYm94IGVkaXRvciwgYW5kIHJldHVybnMgYSBzZXQgb2YgdXNlZnVsIGZ1bmN0aW9ucyBhbmQgdGhlIGVkaXRvciAqL1xuZXhwb3J0IGNvbnN0IGNyZWF0ZVR5cGVTY3JpcHRTYW5kYm94ID0gKFxuICBwYXJ0aWFsQ29uZmlnOiBQYXJ0aWFsPFNhbmRib3hDb25maWc+LFxuICBtb25hY286IE1vbmFjbyxcbiAgdHM6IHR5cGVvZiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpXG4pID0+IHtcbiAgY29uc3QgY29uZmlnID0geyAuLi5kZWZhdWx0UGxheWdyb3VuZFNldHRpbmdzKCksIC4uLnBhcnRpYWxDb25maWcgfVxuICBpZiAoIShcImRvbUlEXCIgaW4gY29uZmlnKSAmJiAhKFwiZWxlbWVudFRvQXBwZW5kXCIgaW4gY29uZmlnKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJZb3UgZGlkIG5vdCBwcm92aWRlIGEgZG9tSUQgb3IgZWxlbWVudFRvQXBwZW5kXCIpXG5cbiAgY29uc3QgZGVmYXVsdFRleHQgPSBjb25maWcuc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0RlZmF1bHRUZXh0XG4gICAgPyBjb25maWcudGV4dFxuICAgIDogZ2V0SW5pdGlhbENvZGUoY29uZmlnLnRleHQsIGRvY3VtZW50LmxvY2F0aW9uKVxuXG4gIC8vIERlZmF1bHRzXG4gIGNvbnN0IGNvbXBpbGVyRGVmYXVsdHMgPSBnZXREZWZhdWx0U2FuZGJveENvbXBpbGVyT3B0aW9ucyhjb25maWcsIG1vbmFjbylcblxuICAvLyBHcmFiIHRoZSBjb21waWxlciBmbGFncyB2aWEgdGhlIHF1ZXJ5IHBhcmFtc1xuICBsZXQgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnNcbiAgaWYgKCFjb25maWcuc3VwcHJlc3NBdXRvbWF0aWNhbGx5R2V0dGluZ0NvbXBpbGVyRmxhZ3MpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGxvY2F0aW9uLnNlYXJjaClcbiAgICBsZXQgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucyA9IGdldENvbXBpbGVyT3B0aW9uc0Zyb21QYXJhbXMoY29tcGlsZXJEZWZhdWx0cywgdHMsIHBhcmFtcylcbiAgICBpZiAoT2JqZWN0LmtleXMocXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucykubGVuZ3RoKVxuICAgICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIEZvdW5kIGNvbXBpbGVyIG9wdGlvbnMgaW4gcXVlcnkgcGFyYW1zOiBcIiwgcXVlcnlQYXJhbUNvbXBpbGVyT3B0aW9ucylcbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyRGVmYXVsdHMsIC4uLnF1ZXJ5UGFyYW1Db21waWxlck9wdGlvbnMgfVxuICB9IGVsc2Uge1xuICAgIGNvbXBpbGVyT3B0aW9ucyA9IGNvbXBpbGVyRGVmYXVsdHNcbiAgfVxuXG4gIGNvbnN0IGlzSlNMYW5nID0gY29uZmlnLmZpbGV0eXBlID09PSBcImpzXCJcbiAgLy8gRG9uJ3QgYWxsb3cgYSBzdGF0ZSBsaWtlIGFsbG93SnMgPSBmYWxzZVxuICBpZiAoaXNKU0xhbmcpIHtcbiAgICBjb21waWxlck9wdGlvbnMuYWxsb3dKcyA9IHRydWVcbiAgfVxuXG4gIGNvbnN0IGxhbmd1YWdlID0gbGFuZ3VhZ2VUeXBlKGNvbmZpZylcbiAgY29uc3QgZmlsZVBhdGggPSBjcmVhdGVGaWxlVXJpKGNvbmZpZywgY29tcGlsZXJPcHRpb25zLCBtb25hY28pXG4gIGNvbnN0IGVsZW1lbnQgPSBcImRvbUlEXCIgaW4gY29uZmlnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY29uZmlnLmRvbUlEKSA6IChjb25maWcgYXMgYW55KS5lbGVtZW50VG9BcHBlbmRcblxuICBjb25zdCBtb2RlbCA9IG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoZGVmYXVsdFRleHQsIGxhbmd1YWdlLCBmaWxlUGF0aClcbiAgbW9uYWNvLmVkaXRvci5kZWZpbmVUaGVtZShcInNhbmRib3hcIiwgc2FuZGJveFRoZW1lKVxuICBtb25hY28uZWRpdG9yLmRlZmluZVRoZW1lKFwic2FuZGJveC1kYXJrXCIsIHNhbmRib3hUaGVtZURhcmspXG4gIG1vbmFjby5lZGl0b3Iuc2V0VGhlbWUoXCJzYW5kYm94XCIpXG5cbiAgY29uc3QgbW9uYWNvU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHsgbW9kZWwgfSwgc2hhcmVkRWRpdG9yT3B0aW9ucywgY29uZmlnLm1vbmFjb1NldHRpbmdzIHx8IHt9KVxuICBjb25zdCBlZGl0b3IgPSBtb25hY28uZWRpdG9yLmNyZWF0ZShlbGVtZW50LCBtb25hY29TZXR0aW5ncylcblxuICBjb25zdCBnZXRXb3JrZXIgPSBpc0pTTGFuZ1xuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmdldEphdmFTY3JpcHRXb3JrZXJcbiAgICA6IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5nZXRUeXBlU2NyaXB0V29ya2VyXG5cbiAgY29uc3QgZGVmYXVsdHMgPSBpc0pTTGFuZ1xuICAgID8gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LmphdmFzY3JpcHREZWZhdWx0c1xuICAgIDogbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LnR5cGVzY3JpcHREZWZhdWx0c1xuXG4gIGRlZmF1bHRzLnNldERpYWdub3N0aWNzT3B0aW9ucyh7XG4gICAgLi4uZGVmYXVsdHMuZ2V0RGlhZ25vc3RpY3NPcHRpb25zKCksXG4gICAgbm9TZW1hbnRpY1ZhbGlkYXRpb246IGZhbHNlLFxuICAgIC8vIFRoaXMgaXMgd2hlbiB0c2xpYiBpcyBub3QgZm91bmRcbiAgICBkaWFnbm9zdGljQ29kZXNUb0lnbm9yZTogWzIzNTRdLFxuICB9KVxuXG4gIC8vIEluIHRoZSBmdXR1cmUgaXQnZCBiZSBnb29kIHRvIGFkZCBzdXBwb3J0IGZvciBhbiAnYWRkIG1hbnkgZmlsZXMnXG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBkZWZhdWx0cy5hZGRFeHRyYUxpYihjb2RlLCBwYXRoKVxuICAgIGNvbnN0IHVyaSA9IG1vbmFjby5VcmkuZmlsZShwYXRoKVxuICAgIGlmIChtb25hY28uZWRpdG9yLmdldE1vZGVsKHVyaSkgPT09IG51bGwpIHtcbiAgICAgIG1vbmFjby5lZGl0b3IuY3JlYXRlTW9kZWwoY29kZSwgXCJqYXZhc2NyaXB0XCIsIHVyaSlcbiAgICB9XG4gICAgY29uZmlnLmxvZ2dlci5sb2coYFtBVEFdIEFkZGluZyAke3BhdGh9IHRvIHJ1bnRpbWVgKVxuICB9XG5cbiAgY29uc3QgZ2V0VHdvU2xhc2hDb21waWxlck9wdGlvbnMgPSBleHRyYWN0VHdvU2xhc2hDb21waWxlck9wdGlvbnModHMpXG5cbiAgLy8gQXV0by1jb21wbGV0ZSB0d29zbGFzaCBjb21tZW50c1xuICBpZiAoY29uZmlnLnN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9ucykge1xuICAgIGNvbnN0IGxhbmdzID0gW1wiamF2YXNjcmlwdFwiLCBcInR5cGVzY3JpcHRcIl1cbiAgICBsYW5ncy5mb3JFYWNoKGwgPT5cbiAgICAgIG1vbmFjby5sYW5ndWFnZXMucmVnaXN0ZXJDb21wbGV0aW9uSXRlbVByb3ZpZGVyKGwsIHtcbiAgICAgICAgdHJpZ2dlckNoYXJhY3RlcnM6IFtcIkBcIiwgXCIvXCIsIFwiLVwiXSxcbiAgICAgICAgcHJvdmlkZUNvbXBsZXRpb25JdGVtczogdHdvc2xhc2hDb21wbGV0aW9ucyh0cywgbW9uYWNvKSxcbiAgICAgIH0pXG4gICAgKVxuICB9XG5cbiAgY29uc3QgdGV4dFVwZGF0ZWQgPSAoKSA9PiB7XG4gICAgY29uc3QgY29kZSA9IGVkaXRvci5nZXRNb2RlbCgpIS5nZXRWYWx1ZSgpXG5cbiAgICBpZiAoY29uZmlnLnN1cHBvcnRUd29zbGFzaENvbXBpbGVyT3B0aW9ucykge1xuICAgICAgY29uc3QgY29uZmlnT3B0cyA9IGdldFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zKGNvZGUpXG4gICAgICB1cGRhdGVDb21waWxlclNldHRpbmdzKGNvbmZpZ09wdHMpXG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5hY3F1aXJlVHlwZXMpIHtcbiAgICAgIGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yKGNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIHdpbmRvdy5mZXRjaC5iaW5kKHdpbmRvdyksIGNvbmZpZylcbiAgICB9XG4gIH1cblxuICAvLyBEZWJvdW5jZWQgc2FuZGJveCBmZWF0dXJlcyBsaWtlIHR3b3NsYXNoIGFuZCB0eXBlIGFjcXVpc2l0aW9uIHRvIG9uY2UgZXZlcnkgc2Vjb25kXG4gIGxldCBkZWJvdW5jaW5nVGltZXIgPSBmYWxzZVxuICBlZGl0b3Iub25EaWRDaGFuZ2VNb2RlbENvbnRlbnQoX2UgPT4ge1xuICAgIGlmIChkZWJvdW5jaW5nVGltZXIpIHJldHVyblxuICAgIGRlYm91bmNpbmdUaW1lciA9IHRydWVcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGRlYm91bmNpbmdUaW1lciA9IGZhbHNlXG4gICAgICB0ZXh0VXBkYXRlZCgpXG4gICAgfSwgMTAwMClcbiAgfSlcblxuICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gU2V0IGNvbXBpbGVyIG9wdGlvbnM6IFwiLCBjb21waWxlck9wdGlvbnMpXG4gIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG5cbiAgLy8gVG8gbGV0IGNsaWVudHMgcGx1ZyBpbnRvIGNvbXBpbGVyIHNldHRpbmdzIGNoYW5nZXNcbiAgbGV0IGRpZFVwZGF0ZUNvbXBpbGVyU2V0dGluZ3MgPSAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB7IH1cblxuICBjb25zdCB1cGRhdGVDb21waWxlclNldHRpbmdzID0gKG9wdHM6IENvbXBpbGVyT3B0aW9ucykgPT4ge1xuICAgIGNvbnN0IG5ld0tleXMgPSBPYmplY3Qua2V5cyhvcHRzKVxuICAgIGlmICghbmV3S2V5cy5sZW5ndGgpIHJldHVyblxuXG4gICAgLy8gRG9uJ3QgdXBkYXRlIGEgY29tcGlsZXIgc2V0dGluZyBpZiBpdCdzIHRoZSBzYW1lXG4gICAgLy8gYXMgdGhlIGN1cnJlbnQgc2V0dGluZ1xuICAgIG5ld0tleXMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGNvbXBpbGVyT3B0aW9uc1trZXldID09IG9wdHNba2V5XSkgZGVsZXRlIG9wdHNba2V5XVxuICAgIH0pXG5cbiAgICBpZiAoIU9iamVjdC5rZXlzKG9wdHMpLmxlbmd0aCkgcmV0dXJuXG5cbiAgICBjb25maWcubG9nZ2VyLmxvZyhcIltDb21waWxlcl0gVXBkYXRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG5cbiAgICBjb21waWxlck9wdGlvbnMgPSB7IC4uLmNvbXBpbGVyT3B0aW9ucywgLi4ub3B0cyB9XG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHVwZGF0ZUNvbXBpbGVyU2V0dGluZyA9IChrZXk6IGtleW9mIENvbXBpbGVyT3B0aW9ucywgdmFsdWU6IGFueSkgPT4ge1xuICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiW0NvbXBpbGVyXSBTZXR0aW5nIGNvbXBpbGVyIG9wdGlvbnMgXCIsIGtleSwgXCJ0b1wiLCB2YWx1ZSlcbiAgICBjb21waWxlck9wdGlvbnNba2V5XSA9IHZhbHVlXG4gICAgZGVmYXVsdHMuc2V0Q29tcGlsZXJPcHRpb25zKGNvbXBpbGVyT3B0aW9ucylcbiAgICBkaWRVcGRhdGVDb21waWxlclNldHRpbmdzKGNvbXBpbGVyT3B0aW9ucylcbiAgfVxuXG4gIGNvbnN0IHNldENvbXBpbGVyU2V0dGluZ3MgPSAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB7XG4gICAgY29uZmlnLmxvZ2dlci5sb2coXCJbQ29tcGlsZXJdIFNldHRpbmcgY29tcGlsZXIgb3B0aW9uczogXCIsIG9wdHMpXG4gICAgY29tcGlsZXJPcHRpb25zID0gb3B0c1xuICAgIGRlZmF1bHRzLnNldENvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpXG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyhjb21waWxlck9wdGlvbnMpXG4gIH1cblxuICBjb25zdCBnZXRDb21waWxlck9wdGlvbnMgPSAoKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBpbGVyT3B0aW9uc1xuICB9XG5cbiAgY29uc3Qgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IChmdW5jOiAob3B0czogQ29tcGlsZXJPcHRpb25zKSA9PiB2b2lkKSA9PiB7XG4gICAgZGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyA9IGZ1bmNcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSByZXN1bHRzIG9mIGNvbXBpbGluZyB5b3VyIGVkaXRvcidzIGNvZGUgKi9cbiAgY29uc3QgZ2V0RW1pdFJlc3VsdCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBtb2RlbCA9IGVkaXRvci5nZXRNb2RlbCgpIVxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IGdldFdvcmtlclByb2Nlc3MoKVxuICAgIHJldHVybiBhd2FpdCBjbGllbnQuZ2V0RW1pdE91dHB1dChtb2RlbC51cmkudG9TdHJpbmcoKSlcbiAgfVxuXG4gIC8qKiBHZXRzIHRoZSBKUyAgb2YgY29tcGlsaW5nIHlvdXIgZWRpdG9yJ3MgY29kZSAqL1xuICBjb25zdCBnZXRSdW5uYWJsZUpTID0gYXN5bmMgKCkgPT4ge1xuICAgIC8vIFRoaXMgaXNuJ3QgcXVpdGUgX3JpZ2h0XyBpbiB0aGVvcnksIHdlIGNhbiBkb3dubGV2ZWwgSlMgLT4gSlNcbiAgICAvLyBidXQgYSBicm93c2VyIGlzIGJhc2ljYWxseSBhbHdheXMgZXNuZXh0LXkgYW5kIHNldHRpbmcgYWxsb3dKcyBhbmRcbiAgICAvLyBjaGVja0pzIGRvZXMgbm90IGFjdHVhbGx5IGdpdmUgdGhlIGRvd25sZXZlbCdkIC5qcyBmaWxlIGluIHRoZSBvdXRwdXRcbiAgICAvLyBsYXRlciBkb3duIHRoZSBsaW5lLlxuICAgIGlmIChpc0pTTGFuZykge1xuICAgICAgcmV0dXJuIGdldFRleHQoKVxuICAgIH1cbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnZXRFbWl0UmVzdWx0KClcbiAgICBjb25zdCBmaXJzdEpTID0gcmVzdWx0Lm91dHB1dEZpbGVzLmZpbmQoKG86IGFueSkgPT4gby5uYW1lLmVuZHNXaXRoKFwiLmpzXCIpIHx8IG8ubmFtZS5lbmRzV2l0aChcIi5qc3hcIikpXG4gICAgcmV0dXJuIChmaXJzdEpTICYmIGZpcnN0SlMudGV4dCkgfHwgXCJcIlxuICB9XG5cbiAgLyoqIEdldHMgdGhlIERUUyBmb3IgdGhlIEpTL1RTICBvZiBjb21waWxpbmcgeW91ciBlZGl0b3IncyBjb2RlICovXG4gIGNvbnN0IGdldERUU0ZvckNvZGUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2V0RW1pdFJlc3VsdCgpXG4gICAgcmV0dXJuIHJlc3VsdC5vdXRwdXRGaWxlcy5maW5kKChvOiBhbnkpID0+IG8ubmFtZS5lbmRzV2l0aChcIi5kLnRzXCIpKSEudGV4dFxuICB9XG5cbiAgY29uc3QgZ2V0V29ya2VyUHJvY2VzcyA9IGFzeW5jICgpOiBQcm9taXNlPFR5cGVTY3JpcHRXb3JrZXI+ID0+IHtcbiAgICBjb25zdCB3b3JrZXIgPSBhd2FpdCBnZXRXb3JrZXIoKVxuICAgIC8vIEB0cy1pZ25vcmVcbiAgICByZXR1cm4gYXdhaXQgd29ya2VyKG1vZGVsLnVyaSlcbiAgfVxuXG4gIGNvbnN0IGdldERvbU5vZGUgPSAoKSA9PiBlZGl0b3IuZ2V0RG9tTm9kZSgpIVxuICBjb25zdCBnZXRNb2RlbCA9ICgpID0+IGVkaXRvci5nZXRNb2RlbCgpIVxuICBjb25zdCBnZXRUZXh0ID0gKCkgPT4gZ2V0TW9kZWwoKS5nZXRWYWx1ZSgpXG4gIGNvbnN0IHNldFRleHQgPSAodGV4dDogc3RyaW5nKSA9PiBnZXRNb2RlbCgpLnNldFZhbHVlKHRleHQpXG5cbiAgY29uc3Qgc2V0dXBUU1ZGUyA9IGFzeW5jIChmc01hcEFkZGl0aW9ucz86IE1hcDxzdHJpbmcsIHN0cmluZz4pID0+IHtcbiAgICBjb25zdCBmc01hcCA9IGF3YWl0IHRzdmZzLmNyZWF0ZURlZmF1bHRNYXBGcm9tQ0ROKGNvbXBpbGVyT3B0aW9ucywgdHMudmVyc2lvbiwgdHJ1ZSwgdHMsIGx6c3RyaW5nKVxuICAgIGZzTWFwLnNldChmaWxlUGF0aC5wYXRoLCBnZXRUZXh0KCkpXG4gICAgaWYgKGZzTWFwQWRkaXRpb25zKSB7XG4gICAgICBmc01hcEFkZGl0aW9ucy5mb3JFYWNoKCh2LCBrKSA9PiBmc01hcC5zZXQoaywgdikpXG4gICAgfVxuXG4gICAgY29uc3Qgc3lzdGVtID0gdHN2ZnMuY3JlYXRlU3lzdGVtKGZzTWFwKVxuICAgIGNvbnN0IGhvc3QgPSB0c3Zmcy5jcmVhdGVWaXJ0dWFsQ29tcGlsZXJIb3N0KHN5c3RlbSwgY29tcGlsZXJPcHRpb25zLCB0cylcblxuICAgIGNvbnN0IHByb2dyYW0gPSB0cy5jcmVhdGVQcm9ncmFtKHtcbiAgICAgIHJvb3ROYW1lczogWy4uLmZzTWFwLmtleXMoKV0sXG4gICAgICBvcHRpb25zOiBjb21waWxlck9wdGlvbnMsXG4gICAgICBob3N0OiBob3N0LmNvbXBpbGVySG9zdCxcbiAgICB9KVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2dyYW0sXG4gICAgICBzeXN0ZW0sXG4gICAgICBob3N0LFxuICAgICAgZnNNYXAsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBUUyBQcm9ncmFtLCBpZiB5b3UncmUgZG9pbmcgYW55dGhpbmcgY29tcGxleFxuICAgKiBpdCdzIGxpa2VseSB5b3Ugd2FudCBzZXR1cFRTVkZTIGluc3RlYWQgYW5kIGNhbiBwdWxsIHByb2dyYW0gb3V0IGZyb20gdGhhdFxuICAgKlxuICAgKiBXYXJuaW5nOiBSdW5zIG9uIHRoZSBtYWluIHRocmVhZFxuICAgKi9cbiAgY29uc3QgY3JlYXRlVFNQcm9ncmFtID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRzdmZzID0gYXdhaXQgc2V0dXBUU1ZGUygpXG4gICAgcmV0dXJuIHRzdmZzLnByb2dyYW1cbiAgfVxuXG4gIGNvbnN0IGdldEFTVCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBwcm9ncmFtID0gYXdhaXQgY3JlYXRlVFNQcm9ncmFtKClcbiAgICBwcm9ncmFtLmVtaXQoKVxuICAgIHJldHVybiBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZVBhdGgucGF0aCkhXG4gIH1cblxuICAvLyBQYXNzIGFsb25nIHRoZSBzdXBwb3J0ZWQgcmVsZWFzZXMgZm9yIHRoZSBwbGF5Z3JvdW5kXG4gIGNvbnN0IHN1cHBvcnRlZFZlcnNpb25zID0gc3VwcG9ydGVkUmVsZWFzZXNcblxuICB0ZXh0VXBkYXRlZCgpXG5cbiAgcmV0dXJuIHtcbiAgICAvKiogVGhlIHNhbWUgY29uZmlnIHlvdSBwYXNzZWQgaW4gKi9cbiAgICBjb25maWcsXG4gICAgLyoqIEEgbGlzdCBvZiBUeXBlU2NyaXB0IHZlcnNpb25zIHlvdSBjYW4gdXNlIHdpdGggdGhlIFR5cGVTY3JpcHQgc2FuZGJveCAqL1xuICAgIHN1cHBvcnRlZFZlcnNpb25zLFxuICAgIC8qKiBUaGUgbW9uYWNvIGVkaXRvciBpbnN0YW5jZSAqL1xuICAgIGVkaXRvcixcbiAgICAvKiogRWl0aGVyIFwidHlwZXNjcmlwdFwiIG9yIFwiamF2YXNjcmlwdFwiIGRlcGVuZGluZyBvbiB5b3VyIGNvbmZpZyAqL1xuICAgIGxhbmd1YWdlLFxuICAgIC8qKiBUaGUgb3V0ZXIgbW9uYWNvIG1vZHVsZSwgdGhlIHJlc3VsdCBvZiByZXF1aXJlKFwibW9uYWNvLWVkaXRvclwiKSAgKi9cbiAgICBtb25hY28sXG4gICAgLyoqIEdldHMgYSBtb25hY28tdHlwZXNjcmlwdCB3b3JrZXIsIHRoaXMgd2lsbCBnaXZlIHlvdSBhY2Nlc3MgdG8gYSBsYW5ndWFnZSBzZXJ2ZXIuIE5vdGU6IHByZWZlciB0aGlzIGZvciBsYW5ndWFnZSBzZXJ2ZXIgd29yayBiZWNhdXNlIGl0IGhhcHBlbnMgb24gYSB3ZWJ3b3JrZXIgLiAqL1xuICAgIGdldFdvcmtlclByb2Nlc3MsXG4gICAgLyoqIEEgY29weSBvZiByZXF1aXJlKFwiQHR5cGVzY3JpcHQvdmZzXCIpIHRoaXMgY2FuIGJlIHVzZWQgdG8gcXVpY2tseSBzZXQgdXAgYW4gaW4tbWVtb3J5IGNvbXBpbGVyIHJ1bnMgZm9yIEFTVHMsIG9yIHRvIGdldCBjb21wbGV4IGxhbmd1YWdlIHNlcnZlciByZXN1bHRzIChhbnl0aGluZyBhYm92ZSBoYXMgdG8gYmUgc2VyaWFsaXplZCB3aGVuIHBhc3NlZCkqL1xuICAgIHRzdmZzLFxuICAgIC8qKiBHZXQgYWxsIHRoZSBkaWZmZXJlbnQgZW1pdHRlZCBmaWxlcyBhZnRlciBUeXBlU2NyaXB0IGlzIHJ1biAqL1xuICAgIGdldEVtaXRSZXN1bHQsXG4gICAgLyoqIEdldHMganVzdCB0aGUgSmF2YVNjcmlwdCBmb3IgeW91ciBzYW5kYm94LCB3aWxsIHRyYW5zcGlsZSBpZiBpbiBUUyBvbmx5ICovXG4gICAgZ2V0UnVubmFibGVKUyxcbiAgICAvKiogR2V0cyB0aGUgRFRTIG91dHB1dCBvZiB0aGUgbWFpbiBjb2RlIGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXREVFNGb3JDb2RlLFxuICAgIC8qKiBUaGUgbW9uYWNvLWVkaXRvciBkb20gbm9kZSwgdXNlZCBmb3Igc2hvd2luZy9oaWRpbmcgdGhlIGVkaXRvciAqL1xuICAgIGdldERvbU5vZGUsXG4gICAgLyoqIFRoZSBtb2RlbCBpcyBhbiBvYmplY3Qgd2hpY2ggbW9uYWNvIHVzZXMgdG8ga2VlcCB0cmFjayBvZiB0ZXh0IGluIHRoZSBlZGl0b3IuIFVzZSB0aGlzIHRvIGRpcmVjdGx5IG1vZGlmeSB0aGUgdGV4dCBpbiB0aGUgZWRpdG9yICovXG4gICAgZ2V0TW9kZWwsXG4gICAgLyoqIEdldHMgdGhlIHRleHQgb2YgdGhlIG1haW4gbW9kZWwsIHdoaWNoIGlzIHRoZSB0ZXh0IGluIHRoZSBlZGl0b3IgKi9cbiAgICBnZXRUZXh0LFxuICAgIC8qKiBTaG9ydGN1dCBmb3Igc2V0dGluZyB0aGUgbW9kZWwncyB0ZXh0IGNvbnRlbnQgd2hpY2ggd291bGQgdXBkYXRlIHRoZSBlZGl0b3IgKi9cbiAgICBzZXRUZXh0LFxuICAgIC8qKiBHZXRzIHRoZSBBU1Qgb2YgdGhlIGN1cnJlbnQgdGV4dCBpbiBtb25hY28gLSB1c2VzIGBjcmVhdGVUU1Byb2dyYW1gLCBzbyB0aGUgcGVyZm9ybWFuY2UgY2F2ZWF0IGFwcGxpZXMgdGhlcmUgdG9vICovXG4gICAgZ2V0QVNULFxuICAgIC8qKiBUaGUgbW9kdWxlIHlvdSBnZXQgZnJvbSByZXF1aXJlKFwidHlwZXNjcmlwdFwiKSAqL1xuICAgIHRzLFxuICAgIC8qKiBDcmVhdGUgYSBuZXcgUHJvZ3JhbSwgYSBUeXBlU2NyaXB0IGRhdGEgbW9kZWwgd2hpY2ggcmVwcmVzZW50cyB0aGUgZW50aXJlIHByb2plY3QuIEFzIHdlbGwgYXMgc29tZSBvZiB0aGVcbiAgICAgKiBwcmltaXRpdmUgb2JqZWN0cyB5b3Ugd291bGQgbm9ybWFsbHkgbmVlZCB0byBkbyB3b3JrIHdpdGggdGhlIGZpbGVzLlxuICAgICAqXG4gICAgICogVGhlIGZpcnN0IHRpbWUgdGhpcyBpcyBjYWxsZWQgaXQgaGFzIHRvIGRvd25sb2FkIGFsbCB0aGUgRFRTIGZpbGVzIHdoaWNoIGlzIG5lZWRlZCBmb3IgYW4gZXhhY3QgY29tcGlsZXIgcnVuLiBXaGljaFxuICAgICAqIGF0IG1heCBpcyBhYm91dCAxLjVNQiAtIGFmdGVyIHRoYXQgc3Vic2VxdWVudCBkb3dubG9hZHMgb2YgZHRzIGxpYiBmaWxlcyBjb21lIGZyb20gbG9jYWxTdG9yYWdlLlxuICAgICAqXG4gICAgICogVHJ5IHRvIHVzZSB0aGlzIHNwYXJpbmdseSBhcyBpdCBjYW4gYmUgY29tcHV0YXRpb25hbGx5IGV4cGVuc2l2ZSwgYXQgdGhlIG1pbmltdW0geW91IHNob3VsZCBiZSB1c2luZyB0aGUgZGVib3VuY2VkIHNldHVwLlxuICAgICAqXG4gICAgICogQWNjZXB0cyBhbiBvcHRpb25hbCBmc01hcCB3aGljaCB5b3UgY2FuIHVzZSB0byBhZGQgYW55IGZpbGVzLCBvciBvdmVyd3JpdGUgdGhlIGRlZmF1bHQgZmlsZS5cbiAgICAgKlxuICAgICAqIFRPRE86IEl0IHdvdWxkIGJlIGdvb2QgdG8gY3JlYXRlIGFuIGVhc3kgd2F5IHRvIGhhdmUgYSBzaW5nbGUgcHJvZ3JhbSBpbnN0YW5jZSB3aGljaCBpcyB1cGRhdGVkIGZvciB5b3VcbiAgICAgKiB3aGVuIHRoZSBtb25hY28gbW9kZWwgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBzZXR1cFRTVkZTLFxuICAgIC8qKiBVc2VzIHRoZSBhYm92ZSBjYWxsIHNldHVwVFNWRlMsIGJ1dCBvbmx5IHJldHVybnMgdGhlIHByb2dyYW0gKi9cbiAgICBjcmVhdGVUU1Byb2dyYW0sXG4gICAgLyoqIFRoZSBTYW5kYm94J3MgZGVmYXVsdCBjb21waWxlciBvcHRpb25zICAqL1xuICAgIGNvbXBpbGVyRGVmYXVsdHMsXG4gICAgLyoqIFRoZSBTYW5kYm94J3MgY3VycmVudCBjb21waWxlciBvcHRpb25zICovXG4gICAgZ2V0Q29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBSZXBsYWNlIHRoZSBTYW5kYm94J3MgY29tcGlsZXIgb3B0aW9ucyAqL1xuICAgIHNldENvbXBpbGVyU2V0dGluZ3MsXG4gICAgLyoqIE92ZXJ3cml0ZSB0aGUgU2FuZGJveCdzIGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICB1cGRhdGVDb21waWxlclNldHRpbmcsXG4gICAgLyoqIFVwZGF0ZSBhIHNpbmdsZSBjb21waWxlciBvcHRpb24gaW4gdGhlIFNBbmRib3ggKi9cbiAgICB1cGRhdGVDb21waWxlclNldHRpbmdzLFxuICAgIC8qKiBBIHdheSB0byBnZXQgY2FsbGJhY2tzIHdoZW4gY29tcGlsZXIgc2V0dGluZ3MgaGF2ZSBjaGFuZ2VkICovXG4gICAgc2V0RGlkVXBkYXRlQ29tcGlsZXJTZXR0aW5ncyxcbiAgICAvKiogQSBjb3B5IG9mIGx6c3RyaW5nLCB3aGljaCBpcyB1c2VkIHRvIGFyY2hpdmUvdW5hcmNoaXZlIGNvZGUgKi9cbiAgICBsenN0cmluZyxcbiAgICAvKiogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGZvdW5kIGluIHRoZSBwYXJhbXMgb2YgdGhlIGN1cnJlbnQgcGFnZSAqL1xuICAgIGNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKipcbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgYGdldFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zYCBpbnN0ZWFkLlxuICAgICAqXG4gICAgICogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGluIHRoZSBzb3VyY2UgY29kZSB1c2luZyB0d29zbGFzaCBub3RhdGlvblxuICAgICAqL1xuICAgIGdldFR3b1NsYXNoQ29tcGxpZXJPcHRpb25zOiBnZXRUd29TbGFzaENvbXBpbGVyT3B0aW9ucyxcbiAgICAvKiogUmV0dXJucyBjb21waWxlciBvcHRpb25zIGluIHRoZSBzb3VyY2UgY29kZSB1c2luZyB0d29zbGFzaCBub3RhdGlvbiAqL1xuICAgIGdldFR3b1NsYXNoQ29tcGlsZXJPcHRpb25zLFxuICAgIC8qKiBHZXRzIHRvIHRoZSBjdXJyZW50IG1vbmFjby1sYW5ndWFnZSwgdGhpcyBpcyBob3cgeW91IHRhbGsgdG8gdGhlIGJhY2tncm91bmQgd2Vid29ya2VycyAqL1xuICAgIGxhbmd1YWdlU2VydmljZURlZmF1bHRzOiBkZWZhdWx0cyxcbiAgICAvKiogVGhlIHBhdGggd2hpY2ggcmVwcmVzZW50cyB0aGUgY3VycmVudCBmaWxlIHVzaW5nIHRoZSBjdXJyZW50IGNvbXBpbGVyIG9wdGlvbnMgKi9cbiAgICBmaWxlcGF0aDogZmlsZVBhdGgucGF0aCxcbiAgICAvKiogQWRkcyBhIGZpbGUgdG8gdGhlIHZmcyB1c2VkIGJ5IHRoZSBlZGl0b3IgKi9cbiAgICBhZGRMaWJyYXJ5VG9SdW50aW1lLFxuICB9XG59XG5cbmV4cG9ydCB0eXBlIFNhbmRib3ggPSBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVUeXBlU2NyaXB0U2FuZGJveD5cbiJdfQ==