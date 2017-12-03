****************************************************************************
Cisco Finesse - Task Management Gadget
Cisco Systems, Inc.
http://www.cisco.com/
http://developer.cisco.com/web/finesse
****************************************************************************

I. Disclaimer
-------------------------------------------------------------------------------

   The Task Management Gadget illustrates the use of finesse.js and ContextServiceGadgetControl.js to perform the
   following functions:
       1) logging into a Media Routing Domain (MRD)
       2) changing state in an MRD
       3) logging out of an MRD
       4) accept and interact with dialogs
       5) signal the Customer Context gadget to display PODs

   This is only a sample and is NOT intended to be a production quality
   gadget and will not be supported as such.  It is NOT guaranteed to
   be bug free. It is merely provided as a guide for a programmer to see
   how to initialize a gadget and set up handlers for user and dialog updates.

    The sample contains the following files:

        _readme.txt - This file
        TaskManagementGadget/
            TaskManagementGadget.xml
            TaskManagementGadget.js
            TaskManagementGadget.css
            tabpanel.js
            test-Messages.xml
            images/
                sprite_presence.png


    This gadget sample is made available to Cisco partners and customers as
    a convenience to help minimize the cost of Cisco Finesse customizations.
    Please see the readme.txt in the finesse javascript libraries zip
    for futher information about the Finesse libraries.

    Please see the "Finesse Web Services Developers Guide" for further
    details about the Media and Dialog APIs. Please see the "Universal Queue" section of
    the "Features Guide" for Unified CCE or Packaged CCE for instructions on
    deploying the CCE Universal Queue Feature along with the Finesse APIs.


II. Requirements
-------------------------------------------------------------------------------

    The system must be configured to support the Task Routing API before using this gadget.
    Follow the section on Universal Queue in the Features Guide for step by step instructions on how to do this.

III. Usage
-------------------------------------------------------------------------------

If configuring the gadget to run within the Finesse desktop:
    1) Place contents from TaskManagementGadget folder into the 3rdpartygadget directory in Finesse.
    2) Add the gadget to the desktop layout under the desired role (Agent, Supervisor) with the following query params:
        mrdid, mrdname, maxdialogs, interruptAction, dialogLogoutAction
    Here is an example of valid XML for this gadget:
        <gadget>/3rdpartygadget/files/TaskManagementGadget.xml?mrdid=5000&mrdname=TestMRD1&maxdialogs=3&interruptAction=ACCEPT&dialogLogoutAction=CLOSE</gadget>

    See the "Third Party Gadgets" chapter in the Finesse Web Services Developer Reference Guide and the "Manage Third-Party Gadgets" chapter in the
    Finesse Administration Guide for more information about uploading third-party gadgets and adding them to the desktop.

If configuring the gadget to run from an external web server:
    1) Upload the gadget files to the web server and configure it to run this gadget as you would for any other web page.
    2) You will need to change the relative paths to local Finesse files to point to your Finesse server in TaskManagementGadget.xml:
    <link rel="stylesheet" href="/desktop/thirdparty/bootstrap/3.2.0/css/bootstrap.css" type="text/css"></link>
    <script type="text/javascript" src="/desktop/assets/js/jquery.min.js"></script>
    <script type="text/javascript" src="/desktop/thirdparty/bootstrap/3.2.0/js/bootstrap.min.js"></script>
    <script type="text/javascript" src="/desktop/assets/js/finesse.js"></script>
    <script type="text/javascript" src="/desktop/js/utilities/MessageDisplay.js"></script>

    will become:

    <link rel="stylesheet" href="http:<finesseIP:port>/desktop/thirdparty/bootstrap/3.2.0/css/bootstrap.css" type="text/css"></link>
    <script type="text/javascript" src="http:<finesseIP:port>/desktop/assets/js/jquery.min.js"></script>
    <script type="text/javascript" src="http:<finesseIP:port>/desktop/thirdparty/bootstrap/3.2.0/js/bootstrap.min.js"></script>
    <script type="text/javascript" src="http:<finesseIP:port>/desktop/assets/js/finesse.js"></script>
    <script type="text/javascript" src="http:<finesseIP:port>/desktop/js/utilities/MessageDisplay.js"></script>
