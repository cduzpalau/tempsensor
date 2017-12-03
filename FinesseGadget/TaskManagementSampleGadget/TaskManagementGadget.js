var finesse = finesse || {};

/** @namespace */
finesse.modules = finesse.modules || {};
finesse.modules.TaskManagementGadget = (function ($) {
    var user, media, utils, uiMsg, mediaDialogs, mrdID, maxDialogs, mediaList,
        interruptAction, dialogLogoutAction, transferTargets,
        states = finesse.restservices.Media.States,
        clientLogs = finesse.cslogger.ClientLogger,
        prefs = new gadgets.Prefs(),
        /**
         * Prefix for call variables in dialog.mediaProperties
         */
        CALL_VARIABLE_PREFIX = "callVariable",
        /**
         * Store the maxDialogLimit, interruptAction, and dialogLogoutAction options to be used with this gadget's
         * media object.
         */
        mediaOptions,
        /**
         * Stores whether or not the application is connected to the Finesse server.
         */
        connected = true,
        /**
         * Track whether the media associated with this gadget has been interrupted.
         */
        interrupted = false,

    /**
     * This loads the page with the "login" screen showing and the agent fields hidden
     */
    showLogin = function() {
        //clear any previous error message
        uiMsg.hideBanner();

        // automatically adjust the height of the gadget to show the html
        $("#mrdInput").val("");
        $("#sign-in").show();
        $("#state-area").hide();
        $("#sign-out").hide();
        $("#mediaSummary").hide();
        adjustGadgetHeight();
    },

    /**
     * Disable or enable buttons on the gadget.
     *   - When the desktop is connected, buttons are enabled.
     *   - When the desktop is disconnected, buttons are disabled.
     *
     * @param if true, buttons are disabled. If false, buttons are enabled.
     */
    toggleUserInterface = function(disabled) {
        $("[id^='allowableActions_'] :button").attr("disabled", disabled);
        $("#routable-checkbox").attr("disabled", disabled);
        $("#state-btn").attr("disabled", disabled);
        $("#sign-in :button").attr("disabled", disabled);
        $("#sign-out :button").attr("disabled", disabled);
    },

    refreshDialogs = function() {
        var id, dialogs = media.getMediaDialogs().getCollection();
        if ( dialogs ) {
            for ( id in dialogs ) {
                dialogs[id].refresh();
            }
        }
    },

    handleInterruptedTransitions = function(currentState) {
        if ( currentState === states.INTERRUPTED ) {
            interrupted = true;
            refreshDialogs();
        } else {
            if ( interrupted ) {
                refreshDialogs();
                interrupted = false;
            }
        }
    },

    /**
     * Populates the fields in the gadget with data.
     */
    render = function () {
        if (!media) {
            return;
        }

        // show media info
        var currentState = media.getState();

        //get state from message bundle if there, otherwise show what API returns
        var stateText = prefs.getMsg(currentState) || currentState;
        var stateElement = $("#stateDropDownText");
        stateElement.text(stateText);

        //display Media ID
        $("#mrdId").text(media.getId());

        var readyButton = $("#goReady");
        var notReadyButton = $("#goNotReady");
        var stateIcon = $("#state-icon-status");

        $("#sign-in").hide();
        $("#state-area").show();
        $("#sign-out").show();
        $("#mediaSummary").show();

        //Display state and appropriate icon, red for NOT_READY, green for READY, yellow for everything else
        stateIcon.removeClass();
        if (!media.isLoggedIn()) {
            showLogin();
        } else if (currentState === states.NOT_READY) {
            stateIcon.addClass("state-icon state-icon-red");
            readyButton.show();
            notReadyButton.hide();
        } else if (currentState === states.READY) {
            stateIcon.addClass("state-icon state-icon-green");
            notReadyButton.show();
            readyButton.hide();
        } else if (currentState === states.WORK) {
            stateIcon.addClass("state-icon state-icon-yellow");
            notReadyButton.show();
            readyButton.hide();
        } else {
            stateIcon.addClass("state-icon state-icon-yellow");
            notReadyButton.hide();
            readyButton.hide();
        }

        //get media's routable field, check checkbox if true, uncheck if false
        var routableCheckbox = $("#routable-checkbox");
        var routable = media.getRoutable();
        routableCheckbox.prop('checked', routable);

        toggleUserInterface(!connected);

        handleInterruptedTransitions(currentState);

        adjustGadgetHeight();
    },

    /**
     * Get call variables from the given dialog
     * @param dialog the dialog containing call variables
     * @returns {{}} a json object whose fields are the names of call variables and whose values are the values of the
     *               call variables. There is also a count field with the number of call variables.
     */
    getCallVariables = function(dialog) {
        var count = 0, property, callVariables = {}, mediaProperties = dialog.getMediaProperties();

        for ( property in mediaProperties ) {
            if ( (property.indexOf(CALL_VARIABLE_PREFIX) == 0) && mediaProperties[property] ) {
                count++;
                callVariables[property] = mediaProperties[property];
            }
        }

        callVariables.count = count;

        return callVariables;
    },

    /**
     *	Appends the call variables to the media dialog if they exist.
     */
    updateCallVars = function(dialog) {
        var i, key, table = $('#cv_table_body_'+dialog.getId()), tr, th, cellCount = 0,
            variables = getCallVariables(dialog), numColumns = Math.min(2, variables.count);

        table.empty();

        if ( numColumns > 0 ) {
            tr = $("<tr>");
            for ( i = 0 ; i < numColumns ; i++ ) {
                tr.append("<th>Variable</th><th>Value</th>");
            }
            table.append(tr);

            for ( i = 1 ; i <= variables.count ; i++ ) {
                if ((cellCount % numColumns) == 0) {
                    tr = $('<tr/>');
                    table.append(tr);
                }

                key = CALL_VARIABLE_PREFIX + i;
                tr.append("<td>" + key + "</td><td>" + variables[key] + "</td>");
                cellCount++;
            }
        }
    },

    /**
     *	Creates the dialog HTML, including buttons and their click handlers, and appends it
     *  to the tab pane.
     */
    displayDialog = function (dialog){
        var dialogId = dialog.getId();

        //show current dialog state
        $("#dialogState_" + dialogId).text(dialog.getState());

        var allowableContainer = $("#allowableActions_" + dialogId);
        //allowableContainer.empty();

        //change the dialog state when a dialog action is clicked
        var actionHandler = function (e) {
                var handlers = {
                    success: handleMediaSuccess,
                    error: handleMediaError
                };
                dialog.setTaskState(e.target.value,handlers);
        };

        //hide all buttons and add click handler, except for transfer
        allowableContainer.children('button').each(function() {
            var element = $(this);
            element.off('click');
            element.on("click", actionHandler);
            element.hide();
        });

        $("#transferButton_" + dialogId).hide();

        var participants = dialog.getParticipants();
        for(var i=0;i<participants.length;i++) {
            var actions = participants[i].actions;

            if(!actions) {
                return;
            }

            actions = actions.action;

            if(!actions) {
                return;
            }
            //convert to array if its not
            if (typeof actions === 'string') {
                actions = [actions];
            }

            //draw action buttons
            for(var j = 0; j <actions.length; j++) {
                var value = actions[j];
                allowableContainer.find('button').each(function() {
                    var buttonValue = $(this).val();
                    if (value === buttonValue) {
                        $(this).show();
                    }
                });
            }
        }

        updateCallVars(dialog);
    },

    /**
     * Parse script-selectors.txt and return array or script selectors for transfer
      * @param file
     * @returns {Array}
     */
    getScriptSelectorsFromFile = function(file) {
        var scriptSelectors = [];
        var scriptSelectorFile = new XMLHttpRequest();
        scriptSelectorFile.open("GET", file, false);
        scriptSelectorFile.onreadystatechange = function ()
        {
            if(scriptSelectorFile.readyState === 4)
            {
                if(scriptSelectorFile.status === 200 || scriptSelectorFile.status == 0)
                {
                    var fileText = scriptSelectorFile.responseText;
                    scriptSelectors = fileText.split(',');
                }
            }
        };
        scriptSelectorFile.send(null);
        return scriptSelectors;
    },

    /**
     * For each dialog, add the transfer button with the dropdown of targets to pick from
     * @param dialog
     */
    addTransferAction = function(dialog){
        var dialogId = dialog.getId();
        var allowableContainer = $("#allowableActions_" + dialogId);

        //click handler for transfer button
        var transferHandler = function(event) {
           dialog.transfer(event.data.target);
        };

        //create transfer button from template and append to allowableContainer
        var template = $('#transfer-button-template').html();
        allowableContainer.append(template);

        //give each button and dropdown a unique id
        var transferDropdown = $("#transferDropdown");
        transferDropdown.attr("id", "transferDropdown_" + dialogId);
        var transferButton = $("#transferButton");
        transferButton.attr("id", "transferButton_" + dialogId);

        //transferTargets gets set in init when gadget loads
        //append each target to the trasfer dropdown
        for(var i in transferTargets) {
            var target = transferTargets[i];
            var element = $("<li><a href='#'>" + target + "</a></li>");
            transferDropdown.append(element);
            element.on("click", {target: target}, transferHandler);
        }
    },

    /**
     *	Callback used upon the load of a media object. This should be used for anything that only needs to be
     *  executed once during initialization.
     */
    handleMediaLoad = function(_media) {
        // Display media name from the desktop layout if there is no name from the API.
        $("#mediaName").text(_media.getName() ? _media.getName() : mrdName);

        loadMediaDialogs(_media);
        //if user signed out of this media or state is unknown, show the sign in button
        if (_media.getState() === states.LOGOUT || _media.getState() === undefined ) {
            showLogin()
        } else {
            _media.refresh();
        }
    },

    /**
     *  Callback used when a media is changed. This is misleading because it will be triggered when any
     *  media changes, not just the one associated with this instance of the gadget.
     */
    handleMediaChange = function(_media) {
        //only update if the notification is for this gadgets's specific media
        //since there could be multiple media gadgets corresponding to a different media id
        if(mrdID === _media._data.id) {
            render();
        }
    },

    /**
     *	Handler used upon a successful action being performed on the media.
     */
    handleMediaSuccess = function(obj){
        //clear any previous error message
        uiMsg.hideBanner();
    },

    /**
     *	Handler called upon a failed action on the media.
     */
    handleMediaError = function(rsp) {
        var errorMessage = rsp.object.ApiErrors.ApiError.ErrorMessage;
        var msg = prefs.getMsg(errorMessage) || errorMessage;

        if(errorMessage == "E_ARM_STAT_AGENT_ALREADY_LOGGED_IN") {
                loadMediaDialogs(media);
                return;
        }

        showError("Operation Failed: " + msg);
    },

    /** shows error banner with dismissable error msg
     *  make the "hide msg" button displayed with the dismissable error msgs was added
     */
    showError = function (error)
    {
        uiMsg.showBannerError(error);
        adjustGadgetHeight();
    },

    /**
     * Load the current user's dialogs.
     * @return {undefined}
     */
    loadMediaDialogs = function (_media) {
        mediaDialogs = _media.getMediaDialogs({
            onCollectionAdd : handleMediaDialogsAdd,
            onCollectionDelete : handleMediaDialogsDelete,
            onLoad: handleMediaDialogsLoad
        });
    },

    handleMediaDialogsLoad = function() {
        //not getting here
        var dialogCollection = mediaDialogs.getCollection(), id;

        for (id in dialogCollection) {
            var dialog = dialogCollection[id];
            handleMediaDialogsAdd(dialog);
        }
    },

    /**
     * If the given dialog contains a media property named POD.ID, instruct the context gadget to display the pod with
     * the given ID.
     */
    displayPodInContextGadget = function(dialog) {
        var podId, mediaProperties = dialog.getMediaProperties();

        for ( property in mediaProperties ) {
            if ( property === "POD.ID" ) {
                podId = mediaProperties[property];
                break;
            }
        }

        if ( podId )
        {
            clientLogs.log("Displaying POD with id " + podId);
            ContextServiceGadgetControl.showPodById(podId);
        }
    },

    /**
     * Handler that is called anytime a dialog is added for the user on all media.
     */
    handleMediaDialogsAdd = function (dialog) {
        $( ".tabbable" ).css( "display", "block" );

        //this gets called whenever there's a dialog change for all media
        //only update if the notification is for this gadgets's specific media
        //since there could be multiple media gadgets corresponding to a different media id
        if(mrdID === dialog._data.mediaProperties.mediaId) {
            createNewTab(dialog.getId());
            addTransferAction(dialog);
            displayDialog(dialog);
            dialog.addHandler("change",displayDialog);
            adjustGadgetHeight();

            displayPodInContextGadget(dialog);
        }
    },

    /**
     * Handler called anytime a dialog is ended
     */
    handleMediaDialogsDelete = function (dialog) {
        if(mrdID === dialog._data.mediaProperties.mediaId) {
            displayDialog(dialog);
            removeCurrentTab(dialog.getId());
            adjustGadgetHeight();
        }
    },

    /**
     * Handler for the onLoad of a User object.  This occurs when the User object is initially read
     * from the Finesse server.  Any once only initialization should be done within this function.
     */
    handleUserLoad = function (_user) {
        mediaList = user.getMediaList( {
            onLoad: handleMediaListLoad
        });
    },

    /**
     * Handler for the onLoad of a MediaList object.  This occurs when the MediaList object is initially read
     * from the Finesse server.
     */
    handleMediaListLoad = function (_mediaList) {
        try {
            //get the media with the specified id
            media = _mediaList.getMedia({
                id: mrdID,
                onLoad: handleMediaLoad,
                onError: handleMediaError,
                onChange: handleMediaChange,
                mediaOptions: mediaOptions
            });
        } catch ( error ) {
            showError(prefs.getMsg("gadget.taskManagementGadget.message.mediaChannelNotFound") + " " + mrdID);
        }
    },

    /**
     * Adjusts the height of the gadget to account for the tab pane which contains dialogs.
     */
    adjustGadgetHeight = function() {
        setTimeout(function() {
            var bScrollHeight = $("body").height();
            var height = bScrollHeight + 20;
            if(height < 125) {
                height = 125;
            }
            gadgets.window.adjustHeight(height);
        },100);
    },

    /**
     * Handler for a failed logout request.
     * @private
     */
    failedSignout = function (user) {
        return function (rsp) {
            var errCode = utils.getErrCode(rsp),   errTxt = prefs.getMsg("gadget.taskManagementGadget.message.signOutError"), errMsg = (errCode) ? errTxt + ": " + errCode : errTxt;
            clientLogs.log("failedSignout("+user.getId()+"): " + errMsg);
            showError(errMsg);
        };
    },

    /**
     * Utility function that returns an array of key-value pairs
     * for the query parameters in a given URL.
     */
    getUrlVars = function(url) {
        var vars = {};
        var parts = url.replace(/[?&]+([^=&]+)=([^&]*)/gi,
            function(m,key,value) {
                vars[key] = value;
            });
        return vars;
    },

    /**
     * Validates that the gadget is configured with the correct query params from the desktop layout.
     * MRD ID is required for the gadget to work. For the MRD name and max dialogs we default to 'Media'
     * and 5 dialogs respectively if they are not configured or misconfigured.
     */
    checkGadgetQueryParams = function() {
        //First get just the URI for this gadget out of the full finesse URI and decode it.
        var gadgetURI = decodeURIComponent(getUrlVars(location.search)["url"]);

        //Now get the individual query params from the gadget URI
        var decodedGadgetURI = getUrlVars(gadgetURI);
        mrdID = decodedGadgetURI["mrdid"];
        mrdName = decodedGadgetURI["mrdname"];
        maxDialogs = decodedGadgetURI["maxdialogs"];
        interruptAction = decodedGadgetURI["interruptAction"];
        dialogLogoutAction = decodedGadgetURI["dialogLogoutAction"];

        //If no MRD ID is configured or it's not a number we want to throw an error during init.
        if (!mrdID || isNaN(mrdID)) {
            return false;
        }

        //If there's no max dialogs configured or the value is not a number then default it to 5.
        if (!maxDialogs || isNaN(maxDialogs)) {
            maxDialogs = "5";
        }

        //If there's no interruptAction configured or the value is not valid, default to "ACCEPT".
        if (!finesse.restservices.InterruptActions.isValidAction(interruptAction)) {
            interruptAction = finesse.restservices.InterruptActions.ACCEPT;
        }

        //If there's no dialogLogoutAction configured or the value is not valid, default to "CLOSE".
        if (!finesse.restservices.DialogLogoutActions.isValidAction(dialogLogoutAction)) {
            dialogLogoutAction = finesse.restservices.DialogLogoutActions.CLOSE;
        }

        //If there's no dialogLogoutAction configured or the value is not valid, default to "CLOSE".
        if (!dialogLogoutAction || dialogLogoutAction.toUpperCase()!=="CLOSE" && dialogLogoutAction.toUpperCase()!=="TRANSFER") {
            dialogLogoutAction = "CLOSE";
        }

        return true;
    };

    /** @scope finesse.modules.TaskManagementGadget */
    return {
        /**
         * Sets the user state on the media that this gadget is configured for.
         */
        setUserStateOnMedia : function (state) {
            //clear any previous error message
            uiMsg.hideBanner();

            //state change will trigger media change notification, which will call handleMediaChange and then re-render
            if (state === 'READY') {
                media.setState(states.READY);
            } else if (state === 'NOT_READY') {
                //hardcoding for now until we do UX for how to do this
                var reasonCode = null;//{id:2};
                media.setState(states.NOT_READY, reasonCode);
            }
        },

        /**
         * Logs out the agent out of the MRD that this gadget is configured for.
         */
        logoutFromMrd : function() {
            var params = {
                handlers: {
                    error: failedSignout(user)
                }
            };
            //hardcoding for now until we do UX for how to do this
            var reasonCode = null;//{id:1};
            media.logout(reasonCode, params);
        },

        /**
         * Login an agent to the MRD that this gadget is configured for.
         * If the agent is successfully logged in to the media it will load
         * the dialogs for the agent on that media, otherwise an error will be thrown.
         */
        loginToMrd : function() {
            var params = {
                maxDialogLimit: mediaOptions.maxDialogLimit,
                interruptAction: mediaOptions.interruptAction,
                dialogLogoutAction: mediaOptions.dialogLogoutAction,
                handlers: {
                    error: handleMediaError
                }
            };
            media.login(params);
        },

        /**
         * Set agent to routable or not routable based on checkbox.
         *
         * Call media API whenever checkbox is checked or unchecked (called from onClick handler in TaskManagementGadget.xml).
         */
        setRoutability : function() {
            var routableCheckbox = $("#routable-checkbox");
            var isRoutable = routableCheckbox.is(":checked");

            var params = {
                routable: isRoutable,
                handlers: {
                    error: handleMediaError
                }
            };

            media.setRoutable(params);
        },

        /**
         * Performs all initialization for this gadget
         */
        init : function () {
            var config = finesse.gadget.Config;

            gadgets.window.setTitle(prefs.getMsg('gadget.taskManagementGadget.message.title'));

            clientLogs = finesse.cslogger.ClientLogger;   // declare clientLogs

            /** Initialize private references */
            utils = finesse.utilities.Utilities;
            msgs = finesse.utilities.I18n.getString;
            uiMsg = finesse.utilities.MessageDisplay;

            adjustGadgetHeight();

            if (!checkGadgetQueryParams()) {
                var err = prefs.getMsg("gadget.taskManagementGadget.message.missingMrdIdParam");
                showError(err);
                $("#sign-in").hide();
                $("#state-area").show();
                $("#sign-out").show();
                $("#mediaSummary").hide();
                gadgets.loadingindicator.dismiss();
                return;
            }

            mediaOptions = {
                maxDialogLimit: maxDialogs,
                interruptAction: interruptAction.toUpperCase(),
                dialogLogoutAction: dialogLogoutAction.toUpperCase()
            };

            //initialize bootstrap tooltips
            $('[data-toggle="tooltip"]').tooltip();

            // Initiate the ClientServices and load the user object.  ClientServices are
            // initialized with a reference to the current configuration.
            finesse.clientservices.ClientServices.init(config);

            // Hookup connect and disconnect handlers so that buttons can be disabled while failing over.
            //
            finesse.clientservices.ClientServices.registerOnConnectHandler(function() {
                connected = true;
                render();
            });
            finesse.clientservices.ClientServices.registerOnDisconnectHandler(function() {
                connected = false;
                render();
            });

            clientLogs.init(gadgets.Hub, "TaskManagementGadget"); //this gadget id will be logged as a part of the message
            user = new finesse.restservices.User({
                id: config.id,
                onLoad : handleUserLoad
            });

            // Initiate the ContainerServices and add a handler for when the tab is visible
            // to adjust the height of this gadget in case the tab was not visible
            // when the html was rendered (adjustHeight only works when tab is visible)

            containerServices = finesse.containerservices.ContainerServices.init();
            containerServices.addHandler(finesse.containerservices.ContainerServices.Topics.ACTIVE_TAB, function(){
                clientLogs.log("Gadget is now visible");  // log to Finesse logger
            });
            containerServices.makeActiveTabReq();

            transferTargets = getScriptSelectorsFromFile('/3rdpartygadget/files/script-selectors.txt');

            //now that the gadget has loaded, remove the loading indicator
            gadgets.loadingindicator.dismiss();
        }
    };
}(jQuery));
