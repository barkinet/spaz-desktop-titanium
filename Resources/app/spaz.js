var MAIN_WINDOW_WIDTH_MIN = 320;
var MAIN_WINDOW_HEIGHT_MIN = 200;


var Spaz;
if (!Spaz) {Spaz = {};}

/**
 * localization helper. Not yet implemented; just returns the passed string 
 */
function $L(str) {
	return str;
}

// Spaz.verified = false;
Spaz.startReloadTimer = function() {
	var refreshInterval = Spaz.Prefs.getRefreshInterval();
	sch.debug('started timer with refresh of ' + refreshInterval + ' msecs');
	reloadID = window.setInterval(Spaz.UI.autoReloadCurrentTab, refreshInterval);
	return reloadID;
};

/**
 * this forces a reload of the index.html doc in the HTMLLoader 
 */
Spaz.reloadHTMLDoc = function() {
	Spaz.Prefs.savePrefs();
	window.location.reload();
};

Spaz.stopReloadTimer = function() {
	if (reloadID) {
		window.clearInterval(reloadID);
		sch.debug('stopped timer');
	}
};

Spaz.restartReloadTimer = function() {
	sch.debug('trying to restart timer');
	Spaz.stopReloadTimer();
	Spaz.startReloadTimer();
};

Spaz.createUserDirs = function() {
	var appStore = sch.getFileObject(sch.getAppStorageDir());
	
	var userThemesDir = Titanium.Filesystem.getFile(appStore, USERDIR_THEMES);
	userThemesDir.createDirectory();

	var userPluginsDir = Titanium.Filesystem.getFile(appStore, USERDIR_PLUGINS);
	userPluginsDir.createDirectory();

	var userSmileysDir = Titanium.Filesystem.getFile(appStore, USERDIR_SMILEYS);
	userSmileysDir.createDirectory();

	var userSoundsDir = Titanium.Filesystem.getFile(appStore, USERDIR_SOUND);
	userSoundsDir.createDirectory();

	sch.debug(userThemesDir.toString());
	sch.debug(userPluginsDir.toString());
	sch.debug(userSmileysDir.toString());
	sch.debug(userSoundsDir.toString());
};


/**
 * loads the user.js file, if it exists, and injects it into the script tag with id='userjs' 
 */
Spaz.loadUserJS = function() {
	var userjsfile = Titanium.Filesystem.getFile(sch.getAppStorageDir(), 'user.js');
	
	if (!userjsfile.exists()) {
		userjsfile.touch();
		Spaz.Sys.setFileContents(userjsfile.toString(), "/* Edit this file to add your own functionality to Spaz */\n\n");
	}
	
	
	$LAB
		.setOptions({
			'UseLocalXHR':false,
			'UseCachePreload':false,
			'UsePreloading':false
		})
		.script(userjsfile.toURL())
		.wait(function() { sch.trigger('load.userjs'); });
	
};



Spaz.loadOAuthServices = function() {
	SpazAuth.addService(SPAZCORE_ACCOUNT_TWITTER, {
		authType: SPAZCORE_AUTHTYPE_OAUTH,
		consumerKey: SPAZCORE_CONSUMERKEY_TWITTER,
		consumerSecret: SPAZCORE_CONSUMERSECRET_TWITTER,
		accessURL: 'https://twitter.com/oauth/access_token'
	});
};


/**
 * Bootstraps the app
 */
Spaz.initialize = function() {
	
	
	Spaz.Windows.makeWindowHidden();
	
	sch.debug('root init begin');
	
	/* @TODO find equivalent */
	// window.htmlLoader.navigateInSystemBrowser = false;

	/* @TODO find equivalent */
	// air.NativeApplication.nativeApplication.autoExit = true;
	
	// create user themes and plugins dirs if necessary
	Spaz.createUserDirs();


	/***************************
	 * Load prefs
	 **************************/
	sch.debug('init prefs');
	Spaz.loadOAuthServices();
	Spaz.Prefs.init();
	Spaz.AccountPrefs.init();
	
	// turn on inspector
	if (Spaz.Prefs.get('inspector-enabled')) {
		Spaz.Debug.openInspector();
	}
	
	
	/*
		wrap this to log
	*/
	function logwrap(fn) {
		return function(){
			Spaz.Debug.logToFile.apply(this, arguments);
			return fn.apply(this, arguments);
		};
	}
	// turn on debugging
	if (Spaz.Prefs.get('debug-enabled')) {
				
		sc.helpers.dump = logwrap(sc.helpers.dump);

		sc.setDumpLevel(5);
	}

	// sch.debug('init Sections');
	// Spaz.Section.init();

	
	// Database initialization
	sch.debug("database initialization");
	// Spaz.DB.init();
	
	sch.debug('JazzRecord initialization');
	JazzRecord.adapter = new JazzRecord.TitaniumAdapter({dbFile: "spaz_jr.db"});
	if (Spaz.Prefs.get('debug-enabled')) {
	 JazzRecord.debug = true;
	}
	JazzRecord.depth = 0;
	JazzRecord.migrate();
	// JazzRecord.addIndex('tweets', 'twitter_id');
	// JazzRecord.addIndex('twusers', 'twitter_id');
	// JazzRecord.addIndex('twusers', 'screen_name');
	JazzRecord.addIndex('drafts', 'updated_at_unixtime');


	Spaz.TweetsModel = new Tweets();

	// Docking initialization
	sch.debug("docking initialization");
	Spaz.Dock.init();

	
	
	Spaz.Sys.initUserAgentString();
	

	Spaz.Windows.makeSystrayIcon();


	// ***************************************************************
	// Keyboard shortcut handling
	// ***************************************************************
	Spaz.Controller.setKeyboardShortcuts();


	// insert theme CSS links
	Spaz.Themes.init();

	/***************************
	 * Apply prefs
	 **************************/
	window.moveTo(Spaz.Prefs.get('window-x'), Spaz.Prefs.get('window-y'));
	window.resizeTo(Spaz.Prefs.get('window-width'), Spaz.Prefs.get('window-height'));
	$('#username').val(Spaz.Prefs.getUsername());
	// $('#password').val(Spaz.Prefs.getPassword());

	//DONE: Check for Update
	if (Spaz.Prefs.get('checkupdate')) {
		sch.debug('Starting check for update');
		Spaz.Update.go();
		sch.debug('Ending check for update');
	}

	/************************
	 * Other stuff to do when document is ready
	 ***********************/
	Spaz.Sounds.playSoundStartup();
	sch.debug('Played startup sound');

	Spaz.Windows.makeWindowVisible();
	sch.debug('Made window visible');

	Spaz.Windows.setWindowOpacity(Spaz.Prefs.get('window-alpha'));
	Spaz.Windows.enableDropShadow(Spaz.Prefs.get('window-dropshadow')); 
	Spaz.Windows.enableRestoreOnActivate(Spaz.Prefs.get('window-restoreonactivate'));
	Spaz.Windows.enableMinimizeOnBackground(Spaz.Prefs.get('window-minimizeonbackground'));
	
	if (Spaz.Prefs.get('window-minimizeatstartup')) {
		Spaz.Windows.windowMinimize();
	}
	

	/*
		this displays the body
	*/
	// $('body').addClass('visible');

	Spaz.UI.tabbedPanels = new Spry.Widget.TabbedPanels("tabs");

	Spaz.UI.prefsCPG = new Spry.Widget.CollapsiblePanelGroup("prefsCPG", {
		contentIsOpen: false,
		duration: 200
	});

	Spaz.UI.buildToolsMenu();

	// $('.TabbedPanelsTab').each(function(i) {
	// 	$this = $(this);
	// 	$this.attr('data-spaz-title',
	// 		[
	// 			$this.attr('data-spaz-title'),
	// 			'Shortcut: CMD or CTRL+' + (parseInt(i, 10) + 1) + ''
	// 		].join("\n")
	// 	);
	// 	console.log("this.outerHTML", this.outerHTML);
	// });
	// sch.debug('Set shortcut info in tab titles');


	/*
		set-up window and app events
	*/
	Titanium.API.addEventListener(Titanium.EXIT, Spaz.Windows.onWindowClose);
	// air.NativeApplication.nativeApplication.addEventListener(air.Event.EXITING, Spaz.Windows.onAppExit);
	Titanium.API.addEventListener(Titanium.CLOSE, Spaz.Windows.onWindowClose);
	Titanium.API.addEventListener(Titanium.FOCUSED, Spaz.Windows.onWindowActive);
	Titanium.API.addEventListener(Titanium.UNFOCUSED, Spaz.Windows.onWindowDeactivate);
	
	Spaz.Windows.listenForMove();
	Spaz.Windows.listenForResize();
	
	/*
		Initialize native menus
	*/
	sch.debug('Spaz.Menus.initAll()');
	Spaz.Menus.initAll();

	/*
		Set up event delegation stuff
	*/
	sch.debug('Spaz.Controller.initIntercept()');
	Spaz.Controller.initIntercept();


	/*
		set-up usernameCompleter
	*/
	sch.debug("new usernameCompleter");
	Spaz.uc = new usernameCompleter({
		'usernames':Spaz.Autocomplete.getScreenNames(),
		'hashtags':Spaz.Autocomplete.getHashTags(),
		'displayDiv':'#suggestions',
		'textarea':'#entrybox',
		'maxMatches':15,
		'timeout':100 // timeout in ms before it kicks in
	});
	
	/*
		set-up post panel
	*/
	sch.debug("new SpazPostPanel");
	Spaz.postPanel = new SpazPostPanel({
		on_submit:function() {
			this.disable();
			var status = sch.trim(this.getMessageText());
			var auth = Spaz.Prefs.getAuthObject();	
			var twit = new SpazTwit({'auth':auth});
			Spaz.Data.setAPIUrl(twit);
			var source = Spaz.Prefs.get('twitter-source');
			var irt_id = this.irt_status_id;
			twit.update(status, source, irt_id, 
				
				function(data) {
					Spaz.postPanel.reset();
					Spaz.postPanel.enable();

					$('#entrybox')[0].blur();

					if (data[0].text.length == 140) {
						if (Spaz.Prefs.get('sound-enabled')) {
							if (Spaz.Prefs.get('wilhelm-enabled')) {
								Spaz.Wilhelm.start();
								Spaz.UI.statusBar("Wilhelm!");
								Spaz.Sounds.playSoundWilhelm();
							} else {
								sch.dump('not doing Wilhelm because Wilhelm disabled');
							}
						} else {
							sch.dump('not doing Wilhelm because sound disabled');
						}
					} else {
						Spaz.Sounds.playSoundUpdate();
						Spaz.UI.statusBar("Update succeeded");
					}

					// if (Spaz.Prefs.get('services-pingfm-enabled')) {
					//	Spaz.Data.updatePingFM(msg);
					// }

				},
				function(xhr, msg, exc) {
					Spaz.postPanel.enable();
					Spaz.UI.statusBar('Posting failed!');
				}
			);
		}
	});
	Spaz.Drafts.updateCounter();

	/*
		Set up timeline calls to action
	*/
	Spaz.Timelines.toggleNewUserCTAs();

	/*
		About popbox
	*/
	$('#about-version').text("v"+Spaz.Sys.getVersion());


	/*
		initialize Image uploader popbox
	*/
	window.SpazImgUpl = new Spaz.ImageUploader();
	window.SpazImgUpl.init();

	// load User JS file
	Spaz.loadUserJS();

	/*
		load news popup
	*/
	setTimeout(Spaz.Newspopup.build, 3000);
	/*
		if we have a username and password set, trigger an "account_switched" event
		to kick things off
	*/
	if (Spaz.Prefs.getUsername() && Spaz.Prefs.getCurrentAccountType()) {		
		
		console.log(Spaz.Prefs.getUsername(), Spaz.Prefs.getCurrentAccountType(), Spaz.Prefs.getCurrentAccount());
		// Initialize indicators of current account
		Spaz.AccountPrefs.updateWindowTitleAndToolsMenu(Spaz.Prefs.getCurrentAccount().id); 
		
		sch.trigger('account_switched', document, Spaz.Prefs.getCurrentAccount());

	}

	sch.debug('ended document.ready()');
};
