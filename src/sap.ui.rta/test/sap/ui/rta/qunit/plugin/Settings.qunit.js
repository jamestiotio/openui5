/* global QUnit */

sap.ui.define([
	"sap/ui/thirdparty/sinon-4",
	"sap/m/Button",
	"sap/ui/layout/VerticalLayout",
	"sap/ui/dt/DesignTime",
	"sap/ui/dt/ElementOverlay",
	"sap/ui/dt/ElementDesignTimeMetadata",
	"sap/ui/rta/command/CommandFactory",
	"sap/ui/rta/command/AppDescriptorCommand",
	"sap/ui/dt/OverlayRegistry",
	"sap/ui/fl/write/api/ChangesWriteAPI",
	"sap/ui/fl/changeHandler/PropertyChange",
	"sap/ui/rta/command/Settings",
	"sap/ui/rta/plugin/Settings",
	"sap/ui/rta/command/Stack",
	"sap/ui/base/ManagedObject",
	"sap/base/Log",
	"test-resources/sap/ui/rta/qunit/RtaQunitUtils",
	"sap/ui/core/Core"
], function(
	sinon,
	Button,
	VerticalLayout,
	DesignTime,
	ElementOverlay,
	ElementDesignTimeMetadata,
	CommandFactory,
	AppDescriptorCommand,
	OverlayRegistry,
	ChangesWriteAPI,
	PropertyChange,
	SettingsCommand,
	SettingsPlugin,
	Stack,
	ManagedObject,
	BaseLog,
	RtaQunitUtils,
	oCore
) {
	"use strict";

	var sDefaultSettingsIcon = "sap-icon://key-user-settings";
	var oCompleteChangeContentStub = sinon.stub(PropertyChange, "completeChangeContent");
	var oMockedAppComponent = RtaQunitUtils.createAndStubAppComponent(sinon);

	var sandbox = sinon.createSandbox();

	function createOverlayWithSettingsAction(oElement, vSettingsAction, bNoFunction) {
		var oSettingsAction = bNoFunction ? vSettingsAction : function() {
			return vSettingsAction;
		};
		return new ElementOverlay({
			element: oElement,
			designTimeMetadata: new ElementDesignTimeMetadata({
				data: {
					actions: {
						settings: oSettingsAction
					}
				}
			})
		});
	}

	QUnit.module("Given a designTime and settings plugin are instantiated", {
		beforeEach() {
			sandbox.stub(ChangesWriteAPI, "getChangeHandler").resolves();
			sandbox.stub(ChangesWriteAPI, "create").resolves({
				getSupportInformation() {
					return {};
				},
				setSupportInformation() {}
			});
			sandbox.stub(ChangesWriteAPI, "apply").resolves({success: true});

			this.oCommandStack = new Stack();
			this.oSettingsPlugin = new SettingsPlugin({
				commandFactory: new CommandFactory(),
				commandStack: this.oCommandStack
			});
			this.oButton = new Button("button", {text: "Button"});
			this.oVerticalLayout = new VerticalLayout({
				content: [this.oButton]
			}).placeAt("qunit-fixture");
			oCore.applyChanges();
		},
		afterEach() {
			sandbox.restore();
			this.oVerticalLayout.destroy();
		}
	}, function() {
		QUnit.test("when an overlay has no settings action designTime metadata", function(assert) {
			var fnDone = assert.async();

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVerticalLayout],
				plugins: [this.oSettingsPlugin],
				designTimeMetadata: {
					"sap.m.Button": {
						actions: {}
					}
				}
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				var oButtonOverlay = OverlayRegistry.getOverlay(this.oButton);
				this.oSettingsPlugin.deregisterElementOverlay(oButtonOverlay);
				this.oSettingsPlugin.registerElementOverlay(oButtonOverlay);

				assert.strictEqual(this.oSettingsPlugin.isAvailable([oButtonOverlay]), false, "... then isAvailable is called, then it returns false");
				assert.strictEqual(this.oSettingsPlugin.isEnabled([oButtonOverlay]), false, "... then isEnabled is called, then it returns false");
				assert.strictEqual(this.oSettingsPlugin._isEditable(oButtonOverlay), false, "then the overlay is not editable");

				this.oDesignTime.destroy();
				fnDone();
			}.bind(this));
		});

		QUnit.test("when an overlay has settings action designTime metadata, but has no isEnabled property defined", function(assert) {
			var fnDone = assert.async();

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVerticalLayout],
				plugins: [this.oSettingsPlugin],
				designTimeMetadata: {
					"sap.m.Button": {
						actions: {
							settings() {
								return {
									handler() {}
								};
							}
						}
					}
				}
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				var oButtonOverlay = OverlayRegistry.getOverlay(this.oButton);
				this.oSettingsPlugin.deregisterElementOverlay(oButtonOverlay);
				this.oSettingsPlugin.registerElementOverlay(oButtonOverlay);

				assert.strictEqual(this.oSettingsPlugin.isAvailable([oButtonOverlay]), true, "... then isAvailable is called, then it returns true");
				assert.strictEqual(this.oSettingsPlugin.isEnabled([oButtonOverlay]), true, "... then isEnabled is called, then it returns true");
				assert.strictEqual(this.oSettingsPlugin._isEditable(oButtonOverlay), true, "then the overlay is editable");

				this.oDesignTime.destroy();
				fnDone();
			}.bind(this));
		});

		QUnit.test("when an overlay has settings action designTime metadata, and isEnabled property is boolean", function(assert) {
			var fnDone = assert.async();

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVerticalLayout],
				plugins: [this.oSettingsPlugin],
				designTimeMetadata: {
					"sap.m.Button": {
						actions: {
							settings() {
								return {
									isEnabled: false,
									handler() {}
								};
							}
						}
					}
				}
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				var oButtonOverlay = OverlayRegistry.getOverlay(this.oButton);
				this.oSettingsPlugin.deregisterElementOverlay(oButtonOverlay);
				this.oSettingsPlugin.registerElementOverlay(oButtonOverlay);

				assert.strictEqual(this.oSettingsPlugin.isAvailable([oButtonOverlay]), true, "... then isAvailable is called, then it returns true");
				assert.strictEqual(this.oSettingsPlugin.isEnabled([oButtonOverlay]), false, "... then isEnabled is called, then it returns correct value");
				assert.strictEqual(this.oSettingsPlugin._isEditable(oButtonOverlay), true, "then the overlay is editable");
				assert.strictEqual(this.oSettingsPlugin.getMenuItems([oButtonOverlay])[0].icon, sDefaultSettingsIcon, "then the default icon parameter is set");

				this.oDesignTime.destroy();
				fnDone();
			}.bind(this));
		});

		QUnit.test("when an overlay has settings action designTime metadata, and isEnabled is function", function(assert) {
			var fnDone = assert.async();

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVerticalLayout],
				plugins: [this.oSettingsPlugin],
				designTimeMetadata: {
					"sap.m.Button": {
						actions: {
							settings() {
								return {
									isEnabled(oElementInstance) {
										return oElementInstance.getMetadata().getName() !== "sap.m.Button";
									}
								};
							}
						}
					}
				}
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				var oButtonOverlay = OverlayRegistry.getOverlay(this.oButton);
				this.oSettingsPlugin.deregisterElementOverlay(oButtonOverlay);
				this.oSettingsPlugin.registerElementOverlay(oButtonOverlay);

				assert.strictEqual(this.oSettingsPlugin.isAvailable([oButtonOverlay]), false, "... then isAvailable is called, then it returns false");
				assert.strictEqual(this.oSettingsPlugin.isEnabled([oButtonOverlay]), false, "... then isEnabled is called, then it returns correct value from function call");
				assert.strictEqual(this.oSettingsPlugin._isEditable(oButtonOverlay), false, "then the overlay is not editable because the handler is missing");

				this.oDesignTime.destroy();
				fnDone();
			}.bind(this));
		});

		QUnit.test("when an overlay has settings action designTime metadata, and icon property is string", function(assert) {
			var fnDone = assert.async();
			var sIcon = "sap-icon://myIcon";

			this.oDesignTime = new DesignTime({
				rootElements: [this.oVerticalLayout],
				plugins: [this.oSettingsPlugin],
				designTimeMetadata: {
					"sap.m.Button": {
						actions: {
							settings() {
								return {
									isEnabled: true,
									icon: sIcon,
									handler() {}
								};
							}
						}
					}
				}
			});

			this.oDesignTime.attachEventOnce("synced", function() {
				var oButtonOverlay = OverlayRegistry.getOverlay(this.oButton);
				this.oSettingsPlugin.deregisterElementOverlay(oButtonOverlay);
				this.oSettingsPlugin.registerElementOverlay(oButtonOverlay);

				assert.strictEqual(this.oSettingsPlugin.isAvailable([oButtonOverlay]), true, "... then isAvailable is called, then it returns true");
				assert.strictEqual(this.oSettingsPlugin.isEnabled([oButtonOverlay]), true, "... then isEnabled is called, then it returns correct value");
				assert.strictEqual(this.oSettingsPlugin._isEditable(oButtonOverlay), true, "then the overlay is editable");
				assert.strictEqual(this.oSettingsPlugin.getMenuItems([oButtonOverlay])[0].icon, sIcon, "then the correct icon parameter is set");

				this.oDesignTime.destroy();
				fnDone();
			}.bind(this));
		});

		QUnit.test("when the handle settings function is called and the handler returns a change object,", function(assert) {
			var done = assert.async();
			var oSettingsChange = {
				selectorElement: this.oButton,
				changeSpecificData: {
					changeType: "changeSettings",
					content: "testchange"
				}
			};

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				isEnabled: true,
				handler() {
					return new Promise(function(resolve) {
						resolve([oSettingsChange]);
					});
				}
			});
			var aSelectedOverlays = [oButtonOverlay];

			var fnAssertSpy = sandbox.spy(ManagedObject.prototype, "applySettings");

			this.oSettingsPlugin.attachEventOnce("elementModified", function(oEvent) {
				var mPassedSettings = fnAssertSpy.getCall(1).args[0];
				var bHasSelector = Object.keys(mPassedSettings).some(function(sKey) {
					return sKey === "selector";
				});
				assert.notOk(bHasSelector, "the selector is not part of the passed settings");
				var oCompositeCommand = oEvent.getParameter("command");
				assert.ok(oCompositeCommand, "Composite command is created");
				var oSettingsCommand = oCompositeCommand.getCommands()[0];
				assert.ok(oSettingsCommand, "... which contains a settings command");
				done();
			});
			return this.oSettingsPlugin.handler(aSelectedOverlays, { eventItem: {}, contextElement: this.oButton }, {});
		});

		QUnit.test("when the handle settings function is called and the handler returns a an empty change object,", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				isEnabled: true,
				handler() {
					return new Promise(function(resolve) {
						resolve([]);
					});
				}
			});

			var oCommandFactory = this.oSettingsPlugin.getCommandFactory();
			var oGetCommandForSpy = sinon.spy(oCommandFactory, "getCommandFor");
			var oFireEventSpy = sinon.spy(this.oSettingsPlugin, "fireElementModified");
			var aSelectedOverlays = [oButtonOverlay];

			return this.oSettingsPlugin.handler(aSelectedOverlays, { eventItem: {}, contextElement: this.oButton })

			.then(function() {
				assert.equal(oGetCommandForSpy.callCount, 0, "then commandFactory.getCommandFor function is not called");
				assert.equal(oFireEventSpy.callCount, 0, "then commandFactory.fireElementModified function is not called");
				assert.ok(true, "CompositeCommand is not created");
			});
		});

		QUnit.test("when the handle settings function is called and no handler is present in Designtime Metadata,", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				isEnabled: true
			});

			var aSelectedOverlays = [oButtonOverlay];

			assert.throws(
				function() {
					this.oSettingsPlugin.handler(aSelectedOverlays, { eventItem: {}, contextElement: this.oButton });
				},
				/Handler not found/,
				"an error message is raised referring to the missing handler"
			);
		});

		QUnit.test("when the handle settings function is called and the handler returns a rejected promise with error object,", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				isEnabled: true,
				handler() {
					return new Promise(function(resolve, reject) {
						reject(Error("Test"));
					});
				}
			});

			var aSelectedOverlays = [oButtonOverlay];

			return this.oSettingsPlugin.handler(aSelectedOverlays, { eventItem: {}, contextElement: this.oButton })

			.catch(function() {
				assert.notOk(this.oSettingsCommand, "... command is not created");
			}.bind(this));
		});

		[true, false].forEach(function(bVariantIndependent) {
			var sMessage = "when the handle settings function is called and a variantManagementReference is present";
			if (bVariantIndependent) {
				sMessage += " and variantIndependent is set";
			}
			QUnit.test(sMessage, function(assert) {
				var done = assert.async();
				var oSettingsChange = {
					selectorElement: this.oButton,
					changeSpecificData: {
						changeType: "changeSettings",
						content: "testchange"
					}
				};

				var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
					isEnabled: true,
					handler() {
						return new Promise(function(resolve) {
							resolve([oSettingsChange]);
						});
					}
				});
				// this mix-in would normally be done by the ControlVariant plugin
				oButtonOverlay.getVariantManagement = function() {
					return "myVMR";
				};
				sandbox.stub(oMockedAppComponent, "getModel").returns({
					getCurrentVariantReference() {
						return "currentVR";
					}
				});
				var aSelectedOverlays = [oButtonOverlay];

				this.oSettingsPlugin.attachEventOnce("elementModified", function() {
					var oChangeSpecificData = ChangesWriteAPI.create.firstCall.args[0].changeSpecificData;
					if (bVariantIndependent) {
						assert.notOk(oChangeSpecificData.variantManagementReference, "the variantManagementReference is not part of the changeSpecificData");
						assert.notOk(oChangeSpecificData.variantReference, "the variantReference is not part of the changeSpecificData");
					} else {
						assert.deepEqual(oChangeSpecificData.variantManagementReference, "myVMR", "the variantManagementReference is part of the changeSpecificData");
						assert.deepEqual(oChangeSpecificData.variantReference, "currentVR", "the variantReference is part of the changeSpecificData");
					}
					done();
				});
				return this.oSettingsPlugin.handler(aSelectedOverlays, { eventItem: {}, contextElement: this.oButton }, {CAUTION_variantIndependent: bVariantIndependent});
			});
		});

		QUnit.test("when two changes are on the command stack,", function(assert) {
			return this.oSettingsPlugin.getCommandFactory().getCommandFor(
				{
					id: "stableNavPopoverId",
					controlType: "sap.m.Button",
					appComponent: oMockedAppComponent
				},
				"settings",
				{
					changeType: "changeSettings",
					content: "testchange1"
				},
				new ElementDesignTimeMetadata({
					data: {
						actions: {
							settings() {}
						}
					}
				})
			)

			.then(function(oSettingsCommand) {
				return this.oCommandStack.pushAndExecute(oSettingsCommand);
			}.bind(this))

			.then(function() {
				return this.oSettingsPlugin.getCommandFactory().getCommandFor(
					{
						id: "stableNavPopoverId",
						controlType: "sap.m.Button",
						appComponent: oMockedAppComponent
					},
					"settings",
					{
						changeType: "changeSettings",
						content: "testchange2"
					},
					new ElementDesignTimeMetadata({
						data: {
							actions: {
								settings() {}
							}
						}
					})
				);
			}.bind(this))

			.then(function(oSettingsCommand) {
				return this.oCommandStack.pushAndExecute(oSettingsCommand);
			}.bind(this))

			.then(function() {
				var aUnsavedChanges = this.oSettingsPlugin._getUnsavedChanges("stableNavPopoverId", ["changeSettings"]);
				assert.equal(aUnsavedChanges.length, 2, "these commands are returned by _getUnsavedChanges");
			}.bind(this));
		});

		QUnit.test("when the handle settings function is called and the handler returns a change object with an app descriptor change,", function(assert) {
			var done = assert.async();
			var mAppDescriptorChange = {
				appComponent: oMockedAppComponent,
				changeSpecificData: {
					appDescriptorChangeType: "appDescriptorChangeType",
					content: {
						parameters: {
							param1: "param1"
						},
						texts: {
							text1: "text1"
						}
					}
				}
			};

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				isEnabled: true,
				handler() {
					return new Promise(function(resolve) {
						resolve([mAppDescriptorChange]);
					});
				}
			});

			this.oSettingsPlugin.attachEventOnce("elementModified", function(oEvent) {
				var oCompositeCommand = oEvent.getParameter("command");
				assert.ok(oCompositeCommand, "Composite command is created");
				var oAppDescriptorCommand = oCompositeCommand.getCommands()[0];
				assert.ok(oAppDescriptorCommand instanceof AppDescriptorCommand, "... which contains an App Descriptor command...");
				assert.equal(oAppDescriptorCommand.getAppComponent(), oMockedAppComponent, "with the correct app component");
				assert.equal(oAppDescriptorCommand.getReference(), "someName", "with the correct reference");
				assert.equal(oAppDescriptorCommand.getChangeType(), mAppDescriptorChange.changeSpecificData.appDescriptorChangeType, "with the correct change type");
				assert.equal(oAppDescriptorCommand.getParameters(), mAppDescriptorChange.changeSpecificData.content.parameters, "with the correct parameters");
				assert.equal(oAppDescriptorCommand.getTexts(), mAppDescriptorChange.changeSpecificData.content.texts, "with the correct texts");

				done();
			});
			return this.oSettingsPlugin.handler([oButtonOverlay], { eventItem: {}, contextElement: this.oButton });
		});

		QUnit.test("when the handle settings function is called and the handler returns a change object with an app descriptor change and a flex change,", function(assert) {
			var done = assert.async();
			var mAppDescriptorChange = {
				appComponent: oMockedAppComponent,
				changeSpecificData: {
					appDescriptorChangeType: "appDescriptorChangeType",
					content: {
						parameters: {
							param1: "param1"
						},
						texts: {
							text1: "text1"
						}
					}
				}
			};
			var mSettingsChange = {
				selectorElement: {
					id: "stableNavPopoverId",
					controlType: "sap.m.Button",
					appComponent: oMockedAppComponent
				},
				changeSpecificData: {
					changeType: "changeSettings",
					content: "testchange"
				}
			};

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				isEnabled: true,
				handler() {
					return new Promise(function(resolve) {
						resolve([mAppDescriptorChange, mSettingsChange]);
					});
				}
			});

			this.oSettingsPlugin.attachEventOnce("elementModified", function(oEvent) {
				var oCompositeCommand = oEvent.getParameter("command");
				assert.ok(oCompositeCommand, "Composite command is created");
				var oAppDescriptorCommand = oCompositeCommand.getCommands()[0];
				var oFlexCommand = oCompositeCommand.getCommands()[1];
				assert.ok(oAppDescriptorCommand instanceof AppDescriptorCommand, "... containing an AppDescriptorCommand");
				assert.equal(oAppDescriptorCommand.getAppComponent(), oMockedAppComponent, "with the correct app component");
				assert.equal(oAppDescriptorCommand.getReference(), "someName", "with the correct reference");
				assert.equal(oAppDescriptorCommand.getChangeType(), mAppDescriptorChange.changeSpecificData.appDescriptorChangeType, "with the correct change type");
				assert.equal(oAppDescriptorCommand.getParameters(), mAppDescriptorChange.changeSpecificData.content.parameters, "with the correct parameters");
				assert.equal(oAppDescriptorCommand.getTexts(), mAppDescriptorChange.changeSpecificData.content.texts, "with the correct texts");
				assert.ok(oFlexCommand instanceof SettingsCommand, "... and a (flex) SettingsCommand");
				assert.equal(oFlexCommand.getSelector().appComponent, oMockedAppComponent, "with the correct app component");
				assert.equal(oFlexCommand.getChangeType(), mSettingsChange.changeSpecificData.changeType, "with the correct change type");
				assert.equal(oFlexCommand.getContent(), mSettingsChange.changeSpecificData.content, "with the correct parameters");
				done();
			});
			return this.oSettingsPlugin.handler([oButtonOverlay], { eventItem: {}, contextElement: this.oButton }, {});
		});

		QUnit.test("when retrieving the context menu item for single 'settings' action", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				handler() {}
			});

			var bIsAvailable = true;
			sandbox.stub(this.oSettingsPlugin, "isAvailable").callsFake(function(aElementOverlays) {
				assert.equal(aElementOverlays[0].getId(), oButtonOverlay.getId(), "the 'available' function calls isAvailable with the correct overlay");
				return bIsAvailable;
			});
			sandbox.stub(this.oSettingsPlugin, "handler").callsFake(function(aOverlays) {
				assert.deepEqual(aOverlays, [oButtonOverlay], "the 'handler' method is called with the right overlays");
			});
			sandbox.stub(this.oSettingsPlugin, "isEnabled").callsFake(function(aElementOverlays) {
				assert.equal(aElementOverlays[0].getId(), oButtonOverlay.getId(), "the 'enabled' function calls isEnabled with the correct overlay");
			});

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems[0].id, "CTX_SETTINGS", "'getMenuItems' returns the context menu item for the plugin");

			aMenuItems[0].handler([oButtonOverlay]);

			bIsAvailable = false;
			assert.equal(
				this.oSettingsPlugin.getMenuItems([oButtonOverlay]).length,
				0,
				"and if plugin is not available for the overlay, no menu items are returned"
			);
		});

		QUnit.test("when retrieving the context menu item for single 'settings' action with a submenu", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				handler() {},
				submenu: [
					{
						name: "subEntry0",
						icon: "sap-icon://accept",
						enabled: true,
						key: "foo"
					},
					{
						enabled: false
					},
					{
						name: "subEntry2",
						key: "bar"
					}
				]
			});

			var bIsAvailable = true;
			sandbox.stub(this.oSettingsPlugin, "isAvailable").callsFake(function(aElementOverlays) {
				assert.equal(aElementOverlays[0].getId(), oButtonOverlay.getId(), "the 'available' function calls isAvailable with the correct overlay");
				return bIsAvailable;
			});

			var oMenuItem = this.oSettingsPlugin.getMenuItems([oButtonOverlay])[0];
			assert.equal(oMenuItem.id, "CTX_SETTINGS", "'getMenuItems' returns the context menu item for the plugin");
			assert.deepEqual(oMenuItem.submenu[0], {
				id: "foo",
				text: "subEntry0",
				icon: "sap-icon://accept",
				enabled: true
			}, "the submennu entry 0 is correct");
			assert.deepEqual(oMenuItem.submenu[1], {
				id: "CTX_SETTINGS_SUB_1",
				text: "",
				icon: "blank",
				enabled: false
			}, "the submennu entry 1 is correct");
			assert.deepEqual(oMenuItem.submenu[2], {
				id: "bar",
				text: "subEntry2",
				icon: "blank",
				enabled: true
			}, "the submennu entry 2 is correct");
		});

		QUnit.test("when retrieving the context menu items and executing two 'settings' actions", function(assert) {
			var done1 = assert.async();
			var done2 = assert.async();

			var mAction1Change = {
				selectorElement: this.oButton,
				changeSpecificData: {
					changeType: "changeSettings",
					content: "testchange1"
				}
			};

			var mAction2Change = {
				selectorElement: this.oButton,
				changeSpecificData: {
					changeType: "changeSettings",
					content: "testchange2"
				}
			};

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, [
				{
					name: "CTX_ACTION1",
					handler() {
						return new Promise(function(resolve) {
							resolve([mAction1Change]);
						});
					},
					runtimeOnly: true
				},
				{
					name() {
						return "Action 2 Name";
					},
					handler() {
						return new Promise(function(resolve) {
							resolve([mAction2Change]);
						});
					}
				}
			]);

			sandbox.stub(this.oSettingsPlugin, "isAvailable").returns(true);

			var bFirstChange = true;

			this.oSettingsPlugin.attachEvent("elementModified", function(oEvent) {
				if (bFirstChange) {
					var oCompositeCommand1 = oEvent.getParameter("command");
					var oFlexCommand1 = oCompositeCommand1.getCommands()[0];
					assert.equal(oFlexCommand1.getSelector().appComponent, oMockedAppComponent, "with the correct app component");
					assert.equal(oFlexCommand1.getChangeType(), mAction1Change.changeSpecificData.changeType, "with the correct change type");
					assert.equal(oFlexCommand1.getContent(), mAction1Change.changeSpecificData.content, "with the correct parameters");
					assert.equal(oFlexCommand1.getRuntimeOnly(), true, "the runtimeOnly property is set");
					bFirstChange = false;
					done1();
				} else {
					var oCompositeCommand2 = oEvent.getParameter("command");
					var oFlexCommand2 = oCompositeCommand2.getCommands()[0];
					assert.equal(oFlexCommand2.getSelector().appComponent, oMockedAppComponent, "with the correct app component");
					assert.equal(oFlexCommand2.getChangeType(), mAction2Change.changeSpecificData.changeType, "with the correct change type");
					assert.equal(oFlexCommand2.getContent(), mAction2Change.changeSpecificData.content, "with the correct parameters");
					assert.notOk(oFlexCommand2.getRuntimeOnly(), "the runtimeOnly property is not set");
					done2();
				}
			});

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems[0].id, "CTX_SETTINGS0", "'getMenuItems' returns the context menu item for action 1");
			assert.equal(aMenuItems[0].rank, 110, "'getMenuItems' returns the correct item rank for action 1");
			assert.equal(aMenuItems[0].icon, sDefaultSettingsIcon, "'getMenuItems' returns the default item icon for action 1");
			aMenuItems[0].handler([oButtonOverlay]);
			assert.equal(aMenuItems[1].id, "CTX_SETTINGS1", "'getMenuItems' returns the context menu item for action 2");
			assert.equal(aMenuItems[1].text, "Action 2 Name", "'getMenuItems' returns the correct item text for action 2");
			assert.equal(aMenuItems[1].rank, 111, "'getMenuItems' returns the correct item rank for action 2");
			assert.equal(aMenuItems[1].icon, sDefaultSettingsIcon, "'getMenuItems' returns the default item icon for action 2");
			aMenuItems[1].handler([oButtonOverlay]);
		});

		QUnit.test("when retrieving the context menu items for two 'settings' actions, but one does not have a handler", function(assert) {
			var done = assert.async();

			var mAction1Change = {
				selectorElement: this.oButton,
				changeSpecificData: {
					changeType: "changeSettings",
					content: "testchange1"
				}
			};

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				CTX_ACTION1: {
					name: "CTX_ACTION1",
					handler() {
						return new Promise(function(resolve) {
							resolve([mAction1Change]);
						});
					}
				},
				AnotherId: {
					name: "CTX_ACTION2"
				}
			});

			sandbox.stub(this.oSettingsPlugin, "isAvailable").returns(true);

			this.oSettingsPlugin.attachEvent("elementModified", function(oEvent) {
				var oCompositeCommand = oEvent.getParameter("command");
				assert.equal(oCompositeCommand.getCommands().length, 1, "but the action with the handler can still be executed");
				done();
			});

			var spyLog = sinon.spy(BaseLog, "warning");

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems[0].id, "CTX_SETTINGS0", "'getMenuItems' returns the context menu item for action 1");
			assert.equal(aMenuItems[0].rank, 110, "'getMenuItems' returns the correct item rank for action 1");
			aMenuItems[0].handler([oButtonOverlay]);
			assert.equal(aMenuItems.length, 1, "'getMenuItems' only returns menu item for actions with handlers");
			assert.equal(spyLog.callCount, 1, "then there is a warning in the log saying the handler was not found for action 2");
		});

		QUnit.test("when retrieving the menu items for two 'settings', one has changeOnRelevantContainer true and the relevant container doesn't have a stable id", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				Action1: {
					name: "CTX_ACTION1",
					handler() {}
				},
				Action2: {
					name: "CTX_ACTION2",
					changeOnRelevantContainer: true,
					handler() {}
				}
			});

			var oVerticalLayoutOverlay = OverlayRegistry.getOverlay(this.oVerticalLayout);

			sandbox.stub(this.oSettingsPlugin, "hasStableId").callsFake(function(oOverlay) {
				if (oOverlay === oVerticalLayoutOverlay) {
					return false;
				}
				return true;
			});

			sandbox.stub(oButtonOverlay, "getRelevantContainer").returns(oVerticalLayoutOverlay);
			sandbox.stub(this.oSettingsPlugin, "isAvailable").returns(true);

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems[0].id, "CTX_SETTINGS0", "'getMenuItems' returns the context menu item for action 1");
			assert.equal(aMenuItems[0].rank, 110, "'getMenuItems' returns the correct item rank for action 1");
			assert.equal(aMenuItems.length, 1, "'getMenuItems' doesn't return the action where the relevant container has no stable id");
			assert.equal(this.oSettingsPlugin._isEditable(oButtonOverlay), true, "and _isEditable() returns true because one action is valid");
		});

		QUnit.test("when retrieving the menu items for two 'settings', but both have changeOnRelevantContainer true and the relevant container doesn't have a stable id", function(assert) {
			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				Action1: {
					name: "CTX_ACTION1",
					changeOnRelevantContainer: true,
					handler() {}
				},
				Action2: {
					name: "CTX_ACTION2",
					changeOnRelevantContainer: true,
					handler() {}
				}
			});

			var oVerticalLayoutOverlay = OverlayRegistry.getOverlay(this.oVerticalLayout);

			sandbox.stub(this.oSettingsPlugin, "hasStableId").callsFake(function(oOverlay) {
				if (oOverlay === oVerticalLayoutOverlay) {
					return false;
				}
				return true;
			});

			sandbox.stub(oButtonOverlay, "getRelevantContainer").returns(oVerticalLayoutOverlay);
			sandbox.stub(this.oSettingsPlugin, "isAvailable").returns(true);

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems.length, 0, "then no menu items are returned");
			assert.equal(this.oSettingsPlugin._isEditable(oButtonOverlay), false, "and _isEditable() returns false because no actions are valid");
		});

		QUnit.test("when retrieving the context menu items for two 'settings' actions, but one is disabled", function(assert) {
			var {oButton} = this;

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, {
				"Button Settings 1": {
					name() { return "CTX_ACTION1"; },
					handler() {
						return new Promise(function(resolve) {
							resolve([]);
						});
					}
				},
				"Another Button Settings Action": {
					name() { return "CTX_ACTION2"; },
					handler() {
						return new Promise(function(resolve) {
							resolve([]);
						});
					},
					isEnabled(oElement) {
						assert.equal(oElement, oButton, "isEnabled is called with the correct element");
						return false;
					}
				}
			}, true);

			sandbox.stub(this.oSettingsPlugin, "isAvailable").returns(true);

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems[0].text, "CTX_ACTION1", "'getMenuItems' returns the context menu item for action 1");
			assert.equal(aMenuItems[0].enabled, true, "and it is enabled");
			assert.equal(aMenuItems[1].text, "CTX_ACTION2", "'getMenuItems' returns the context menu item for action 2");
			assert.equal(aMenuItems[1].enabled([oButtonOverlay]), false, "and it is disabled");
		});

		QUnit.test("when retrieving the context menu items and executing two 'settings' actions with diffrent icon settings", function(assert) {
			var sIconAction1 = "sap-icon://myIconAction1";

			var oButtonOverlay = createOverlayWithSettingsAction(this.oButton, [
				{
					name: "CTX_ACTION1",
					icon: sIconAction1,
					handler() {
						return new Promise(function(resolve) {
							resolve([]);
						});
					}
				},
				{
					name() {
						return "Action 2 Name";
					},
					handler() {
						return new Promise(function(resolve) {
							resolve([]);
						});
					}
				},
				{
					name() {
						return "Action 3 Name";
					},
					icon: { name: "icon should be a STRING not an Object" },
					handler() {
						return new Promise(function(resolve) {
							resolve([]);
						});
					}
				}
			]);

			var oLogErrorStub = sandbox.stub(BaseLog, "error");
			sandbox.stub(this.oSettingsPlugin, "isAvailable").returns(true);

			var aMenuItems = this.oSettingsPlugin.getMenuItems([oButtonOverlay]);
			assert.equal(aMenuItems[0].id, "CTX_SETTINGS0", "'getMenuItems' returns the context menu item for action 1");
			assert.equal(aMenuItems[0].rank, 110, "'getMenuItems' returns the correct item rank for action 1");
			assert.equal(aMenuItems[0].icon, sIconAction1, "'getMenuItems' returns the correct item icon for action 1");
			aMenuItems[0].handler([oButtonOverlay]);
			assert.equal(aMenuItems[1].id, "CTX_SETTINGS1", "'getMenuItems' returns the context menu item for action 2");
			assert.equal(aMenuItems[1].text, "Action 2 Name", "'getMenuItems' returns the correct item text for action 2");
			assert.equal(aMenuItems[1].rank, 111, "'getMenuItems' returns the correct item rank for action 2");
			assert.equal(aMenuItems[1].icon, sDefaultSettingsIcon, "'getMenuItems' returns the default item icon for action 2");
			aMenuItems[1].handler([oButtonOverlay]);
			assert.equal(aMenuItems[2].id, "CTX_SETTINGS2", "'getMenuItems' returns the context menu item for action 3");
			assert.equal(aMenuItems[2].text, "Action 3 Name", "'getMenuItems' returns the correct item text for action 3");
			assert.equal(aMenuItems[2].rank, 112, "'getMenuItems' returns the correct item rank for action 3");
			assert.equal(aMenuItems[2].icon, sDefaultSettingsIcon, "'getMenuItems' returns the default item icon for action 3");
			assert.equal(oLogErrorStub.getCall(0).args[0], "Icon setting for settingsAction should be a string", "'getMenuItems' cause the correct error message for action 3");
			aMenuItems[2].handler([oButtonOverlay]);
		});
	});

	QUnit.done(function() {
		oCompleteChangeContentStub.restore();
		oMockedAppComponent._restoreGetAppComponentStub();
		oMockedAppComponent.destroy();
		document.getElementById("qunit-fixture").style.display = "none";
	});
});
