//META{"name":"LxiBotSupport","website":"https://github.com/pacucci/lxibot-ease-plugin","source":"https://github.com/pacucci/lxibot-ease-plugin"}*//

/*@cc_on
@if (@_jscript)

	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

var LxiBotSupport = (() => {
  const config = {
    "info": {
      "name": "LxiBot Support",
      "authors": [{
        "name": "Kyza & LolloG",
        "discord_id": "374859398960513025",
        "github_username": "pacucci"
      }],
      "version": "1.3.21",
      "description": "Adds a button which allows you to use LxiBot with ease.",
      "website": "pacucci-f.glitch.me",
      "github_raw": "https://raw.githubusercontent.com/pacucci/lxibot-ease-plugin/master/LxibotSupport.plugin.js"
    },
    "changelog": [
       {
       	"title": "Welcome!",
       	"items": ["Now the LxiBot Button will change image depending on the theme.", "Added this changelog."]
       }
       ,
       {
        "title": "Bugs Squashed",
         "type": "fixed",
         "items": ["The button now shows up when switching channels.","The blurred background will no longer disappear when used with other plugins."]
       }
       ,
      {
      	"title": "Announcement",
      	"type": "improved",
      	"items": ["Hey everyone! I'd just like to ask you to visit a website called teamtrees.org if you haven't already, that's all. Don't bug support about this, it's just an announcement."]
      }
       ,
       {
       	"title": "In Progress",
       	"type": "progress",
       	"items": ["Adding more commands to be argument-supported, now just add a space in the CommandName part if a command still isn't supported."]
       }
    ],
    "main": "index.js"
  };

  return !global.ZeresPluginLibrary ? class {
    constructor() {
      this._config = config;
    }
    getName() {
      return config.info.name;
    }
    getAuthor() {
      return config.info.authors.map(a => a.name).join(", ");
    }
    getDescription() {
      return config.info.description;
    }
    getVersion() {
      return config.info.version;
    }
    load() {
    PluginUpdater.checkForUpdate("LxiBotSupport", this.getVersion(), this.config.github_raw);

    let libraryScript = document.getElementById("ZLibraryScript");
      if (!libraryScript || !window.ZLibrary) {
        if (libraryScript) libraryScript.parentElement.removeChild(libraryScript);
        libraryScript = document.createElement("script");
        libraryScript.setAttribute("type", "text/javascript");
        libraryScript.setAttribute("src", "https://rauenzi.github.io/BDPluginLibrary/release/ZLibrary.js");
        libraryScript.setAttribute("id", "ZLibraryScript");
        document.head.appendChild(libraryScript);
      }
    }
    start() {}
    stop() {}
  } : (([Plugin, Api]) => {
    const plugin = (Plugin, Api) => {
      const {
        DiscordModules,
        Logger,
        Patcher,
        WebpackModules,
        PluginUpdater,
        PluginUtilities,
        DiscordAPI
      } = Api;

      const {
        MessageStore,
        UserStore,
        ImageResolver,
        ChannelStore,
        Dispatcher
      } = DiscordModules;

      const selectors = {
        "chat": WebpackModules.getByProps('chat').chat,
        "chatContent": WebpackModules.getByProps('chatContent').chatContent
      };

      var embedOpen = false;
      var recentEmbeds = [];

      var updateInterval;
      var makeSureClosedInterval;

      var popupWrapperWidth = 320;
      var popupWrapperHeight = 230;

      var oldImageUrl;
      var oldImageWidth = -1;
      var oldImageHeight = -1;

      var oldDescription = "";
      var oldcommandName = "";
      var disabledDescription = "You must have an author name to use the description or provider name with image banner mode on.";
      var disabledcommandName = "Read the description box.";

      return class LxiBotSupport extends Plugin {

        onStart() {
          /* Start Libraries */

          makeSureClosedInterval = setInterval(() => {
            if (!embedOpen) {
              this.closeEmbedPopup();
            }
          }, 1000);

          this.addButton();

          // loadRecentEmbeds();
        }

        onStop() {
          clearInterval(updateInterval);
          clearInterval(makeSureClosedInterval);
          this.removeButton();
        }

        loadRecentEmbeds() {
          try {
            // Load the recent embeds.
            var pluginsFolder = PluginUtilities.getBDFolder("plugins");

            var fs = require("fs");
            recentEmbeds = JSON.parse(fs.readFileSync(pluginsFolder + "/LxiBotSupport.recentEmbeds.json"));
          } catch (e) {
            recentEmbeds = [];
          }
        }
	      
	onSwitch() {
	  // Use this as a backup.
	  this.addButton();
	}

        observer({
          addedNodes
        }) {
          for (const node of addedNodes) {
            if (node.className == selectors.chat || node.className == selectors.chatContent) {
              this.addButton();
            }
          }
        }
	
        addButton() {
          try {
            var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
            var channelObject = DiscordAPI.Channel.fromId(channelId);
            if (!channelObject) return;
            var channel = DiscordAPI.Channel.from(channelObject);
            var permissions = channel.discordObject.permissions;

            // Only add the button if the user has permissions to send messages and embed links.
            if (this.hasPermission("textSendMessages")) {
							if (ZLibrary.DiscordModules.UserSettingsStore.theme == "dark"){

              if (document.getElementsByClassName("embed-button-wrapper").length == 0) {
				  
                var daButtons = document.getElementsByClassName("buttons-205you")[0];
                var embedButton = document.createElement("button");
                embedButton.setAttribute("type", "button");
                embedButton.setAttribute("class", "buttonWrapper-1ZmCpA da-buttonWrapper button-38aScr da-button lookBlank-3eh9lL da-lookBlank colorBrand-3pXr91 da-colorBrand grow-q77ONN da-grow normal embed-button-wrapper");

                var embedButtonInner = document.createElement("div");
                embedButtonInner.setAttribute("class", "contents-18-Yxp da-contents button-3AYNKb da-button button-2vd_v_ da-button embed-button-inner");

                var embedButtonIcon = document.createElement("img");
                //version="1.1" xmlns="http://www.w3.org/2000/svg" class="icon-3D60ES da-icon" viewBox="0 0 22 22" fill="currentColor"
                embedButtonIcon.setAttribute("src", "https://cdn.discordapp.com/attachments/455027925394128916/647435192767741971/invert.png");
                embedButtonIcon.setAttribute("class", "icon-3D60ES da-icon");
                embedButtonIcon.setAttribute("style", "filter: invert(70%) !important;");
                embedButtonIcon.setAttribute("width", "22");
                embedButtonIcon.setAttribute("height", "22");

                embedButtonIcon.onmouseover = () => {
                  embedButtonIcon.setAttribute("style", "filter: invert(100%) !important;");
                };
                embedButtonIcon.onmouseout = () => {
                  embedButtonIcon.setAttribute("style", "filter: invert(70%) !important;");
                };

                embedButtonInner.appendChild(embedButtonIcon);
                embedButton.appendChild(embedButtonInner);
                daButtons.insertBefore(embedButton, daButtons.firstChild);

                embedButton.onclick = () => {
                  var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
                  var channel = DiscordAPI.Channel.from(DiscordAPI.Channel.fromId(channelId));

                  // Only send the embed if the user has permissions to embed links.
                  if (this.hasPermission("textSendMessages") || channel.type != "GUILD_TEXT") {
                    this.openEmbedPopup();
                  } else {
                    BdApi.alert("LxiBotSupport", `You do not have permissions to send messages in this channel.\n\nThis is not a problem with the plugin, it is a server setting.`);
                  }
                };
              }
          }else{
			  
			 
              if (document.getElementsByClassName("embed-button-wrapper").length == 0) {
				  
                var daButtons = document.getElementsByClassName("buttons-205you")[0];
                var embedButton = document.createElement("button");
                embedButton.setAttribute("type", "button");
                embedButton.setAttribute("class", "buttonWrapper-1ZmCpA da-buttonWrapper button-38aScr da-button lookBlank-3eh9lL da-lookBlank colorBrand-3pXr91 da-colorBrand grow-q77ONN da-grow normal embed-button-wrapper");

                var embedButtonInner = document.createElement("div");
                embedButtonInner.setAttribute("class", "contents-18-Yxp da-contents button-3AYNKb da-button button-2vd_v_ da-button embed-button-inner");

                var embedButtonIcon = document.createElement("img");
                //version="1.1" xmlns="http://www.w3.org/2000/svg" class="icon-3D60ES da-icon" viewBox="0 0 22 22" fill="currentColor"
                embedButtonIcon.setAttribute("src", "https://blobscdn.gitbook.com/v0/b/gitbook-28427.appspot.com/o/spaces%2F-LKgTkX3Q3L2Bkm8JPAe%2Favatar.png?generation=1535123715163241&alt=media");
                embedButtonIcon.setAttribute("class", "icon-3D60ES da-icon");
                embedButtonIcon.setAttribute("width", "22");
                embedButtonIcon.setAttribute("height", "22");

                embedButtonIcon.onmouseover = () => {
                  embedButtonIcon.setAttribute("style", "filter: opacity(100%) !important;");
                };
                embedButtonIcon.onmouseout = () => {
                  embedButtonIcon.setAttribute("style", "filter: opacity(70%) !important;");
                };

                embedButtonInner.appendChild(embedButtonIcon);
                embedButton.appendChild(embedButtonInner);
                daButtons.insertBefore(embedButton, daButtons.firstChild);

                embedButton.onclick = () => {
                  var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
                  var channel = DiscordAPI.Channel.from(DiscordAPI.Channel.fromId(channelId));

                  // Only send the embed if the user has permissions to embed links.
                  if (this.hasPermission("textSendMessages") || channel.type != "GUILD_TEXT") {
                    this.openEmbedPopup();
                  } else {
                    BdApi.alert("LxiBotSupport", `You do not have permissions to send messages in this channel.\n\nThis is not a problem with the plugin, it is a server setting.`);
                  }
                };
              } 
			  
		  }  
		  
		  
		  
		  
		  } else {
              this.removeButton();
            }
          } catch (e) {
            console.log(e);
          }
		  
        }


        removeButton() {
          if (document.getElementsByClassName("embed-button-wrapper").length > 0) {
            document.getElementsByClassName("embed-button-wrapper")[0].remove();
          }
        }

        sendEmbed(commandName, commandArgs1, commandArgs2) {
          var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
          var channel = DiscordAPI.Channel.from(DiscordAPI.Channel.fromId(channelId));

         
			  var musicWords = [
			  "play",
			  "stop",
              "skip",
			  "pause",
			  "resume",
			  "queue",
			  "np",
			  ];

			  if (musicWords.includes(commandName)){
  if(commandName=="play") return DiscordAPI.Channel.fromId(channelId).sendMessage(`l!`+commandName +" "+commandArgs1);

				  DiscordAPI.Channel.fromId(channelId).sendMessage(`l!`+commandName);
			  
			  }else
			  {
								  //Handle Commands with Mentions

                  if(commandName=="voicecheck" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="snipe" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="fight" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="ban" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+ " "+commandArgs2);
				  if(commandName=="kick" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+ " "+commandArgs2);
				  if(commandName=="report" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+ " "+commandArgs2);
				  if(commandName=="tempmute" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+ " "+commandArgs2);
				  if(commandName=="cmute" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+ " "+commandArgs2);
				  if(commandName=="cunmute" & commandArgs1.includes("<@"))	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+ " "+commandArgs2);

				  
				  //Handle Commands without Mentions
				  				  if(commandName=="pwnedemail")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  				  if(commandName=="youtube")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  				  if(commandName=="als")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="ratewaifu")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
                  if(commandName=="userinfo")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="invert")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="circle")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="magik")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="spotify")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="wall")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="explode")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="implode")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="8ball")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="flipword")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="fortnite")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="discrim")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="illegal")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="achievement")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="canvas")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="mcoldnames")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="osu")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="weather")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="emoteinfo")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="urban")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="dsb")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="bs")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="roleinfo")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="invert")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="mirror")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="deepfry")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="lockdown")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="support")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);
				  if(commandName=="global")return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1);

				  				  //Handle Commands with 2 Args
				  if(commandName=="mbl")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+" "+commandArgs2);
				  if(commandName=="hypixel")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+" "+commandArgs2);
				  if(commandName=="mcserver")	return DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName +" "+commandArgs1+" "+commandArgs2);


				  
				  								  //Handle Commands without Args

				  			 DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+commandName);

			  }
         
	  }
	
	
	
	

        openEmbedPopup() {
          if (!document.getElementById("CommandUsageWrapper")) {
            embedOpen = true;

            var popupWrapper = document.createElement("div");
            popupWrapper.setAttribute("id", "CommandUsageWrapper");

            var embedButton = document.getElementsByClassName("embed-button-wrapper")[0].getBoundingClientRect();
            var positionInterval = setInterval(() => {
              if (!document.getElementById("CommandUsageWrapper")) {
                window.clearInterval(positionInterval);
              }
			  //background-color: #161E2D;

              popupWrapper.setAttribute("style", "text-align: center; border-radius: 10px; width: " + popupWrapperWidth + "px; height: " + popupWrapperHeight + "px; position: absolute; top: " + ((window.innerHeight / 2) - (popupWrapperHeight / 2)) + "px; left: " + ((window.innerWidth / 2) - (popupWrapperWidth / 2)) +
			  "px; background: url('https://i.redd.it/y1ostvqnr4711.jpg'); z-index: 999999999999999999999; text-rendering: optimizeLegibility;");
            }, 100);

            // Exit button: <svg width="18" height="18" class="button-1w5pas da-button dropdown-33sEFX da-dropdown open-1Te94t da-open"><g fill="none" fill-rule="evenodd"><path d="M0 0h18v18H0"></path><path stroke="#FFF" d="M4.5 4.5l9 9" stroke-linecap="round"></path><path stroke="#FFF" d="M13.5 4.5l-9 9" stroke-linecap="round"></path></g></svg>
            var exitButton = document.createElement("div");
            exitButton.setAttribute("style", "position: absolute; width: 18px; height: 18px; right: 10px; top: 10px;");
            exitButton.innerHTML = `<svg width="18" height="18" class="button-1w5pas dropdown-33sEFX open-1Te94t"><g fill="none" fill-rule="evenodd">
			<path d="M0 0h18v18H0"></path>
			<path stroke="#161E2D" d="M4.5 4.5l9 9" stroke-linecap="round"></path>
			<path stroke="#161E2D" d="M13.5 4.5l-9 9" stroke-linecap="round"></path></g></svg>`;
 

 var LxiBotButton = document.createElement("img");
            LxiBotButton.setAttribute("style", "position: absolute; width: 27px; height: 27px; left: 120px; top: 17px;");
			            LxiBotButton.setAttribute("src", "https://cdn.discordapp.com/avatars/454713729649475594/aafeabfa76e9f1e532184cf5600963d0.png?size=2048");


var musicButton = document.createElement("img");
            musicButton.setAttribute("style", "position: absolute; width: 23px; height: 23px; left: 175px; top: 17px;");
			           musicButton.setAttribute("src", "https://image.flaticon.com/icons/png/512/122/122320.png");
var statsButton = document.createElement("img");
            statsButton.setAttribute("style", "position: absolute; width: 23px; height: 23px; left: 275px; top: 17px;");
			           statsButton.setAttribute("src", "https://img.icons8.com/material/24/000000/future.png");

//https://iconsplace.com/wp-content/uploads/_icons/ffffff/256/png/music-icon-18-256.png
            var commandName = document.createElement("input");
             commandName.setAttribute("id", "commandName");
            commandName.setAttribute("maxlength", "256");

            var commandArgs1 = document.createElement("input");
             commandArgs1.setAttribute("id", "commandArgs1");
            commandArgs1.setAttribute("maxlength", "256");
			
			
			 var commandArgs2 = document.createElement("input");
             commandArgs2.setAttribute("id", "commandArgs1");
            commandArgs2.setAttribute("maxlength", "256");
			
			
 var submitButton = document.createElement("input");
            var opacityBackground = document.createElement("div");
          
            var inputStyle = "width: 275px; margin: auto auto 10px auto;";
            var textInputStyle = "background-color: #fff; border: none; border-radius: 5px; height: 30px; padding-left: 10px; padding-right: 10px;";

            commandName.setAttribute("type", "text");
            commandName.setAttribute("placeholder", "Command Name");
            commandName.setAttribute("style", inputStyle + "margin-top: 20px;" + textInputStyle);
            commandName.oninput = () => {
              oldcommandName =  commandName.value;

            };

            commandArgs1.setAttribute("type", "text");
            commandArgs1.setAttribute("placeholder", "1st Argument");
            commandArgs1.setAttribute("style", inputStyle + textInputStyle);
            commandArgs1.oninput = () => {
            };
			  commandArgs2.setAttribute("type", "text");
            commandArgs2.setAttribute("placeholder", "2nd Argument");
            commandArgs2.setAttribute("style", inputStyle + textInputStyle);
            commandArgs2.oninput = () => {
            };

           


            exitButton.setAttribute("type", "button");
			            exitButton.setAttribute("style", "margin-top: 20px;" );
	statsButton.onclick = () => {
					//BdApi.alert("LxiBotSupport Beta-Feature","This feature is currently in development,\n please ignore it.")
					//BdApi.showToast("Showing changelog:")
			/*		  const title = "LxiBotSupport Beta-Feature";
            const ModalStack = BdApi.findModuleByProps("push", "update", "pop", "popWithKey");
            const TextElement = BdApi.findModuleByProps("Sizes", "Weights");
            const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() == "confirm-modal");
            ModalStack.push(function(props) {
                return BdApi.React.createElement(ConfirmationModal, Object.assign({
                    header: title,
                    children: [TextElement({color: TextElement.Colors.PRIMARY, children: [`This feature is currently in developmentand could have some bugs,\n please ignore it.`]})],
                    red: false,
                    confirmText: "Really really really use it",
                    cancelText: "Cancel",
                    onConfirm: () => {

                    }
                }, props));
            });*/


												this.showChangelog()

                  this.closeEmbedPopup();
                }
              
exitButton.onclick = () => {
           
                  this.closeEmbedPopup();
                }
				
				
				LxiBotButton.onclick = () => {
              var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
				  			 DiscordAPI.Channel.fromId(channelId).sendMessage(`l+`+"help");
							 this.closeEmbedPopup()
                }
					musicButton.onclick = () => {
              var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
				  			 DiscordAPI.Channel.fromId(channelId).sendMessage(`l!`+"help");
							 this.closeEmbedPopup()
                }
                              popupWrapper.appendChild(exitButton);

           
            submitButton.setAttribute("type", "button");
            submitButton.setAttribute("value", "Send");
            submitButton.setAttribute("style", inputStyle + "background-color: #F35353; border: none; border-radius: 5px; color: #fff; height: 30px;");

            submitButton.onclick = () => {
           
                  this.sendEmbed(commandName.value, commandArgs1.value, commandArgs2.value);
                  this.closeEmbedPopup();
                }
				
			

            popupWrapper.appendChild(commandName);
            popupWrapper.appendChild(commandArgs1);
            popupWrapper.appendChild(commandArgs2);
            popupWrapper.appendChild(statsButton);

            popupWrapper.appendChild(submitButton);
                    popupWrapper.appendChild(LxiBotButton);
            popupWrapper.appendChild(musicButton);

            // var jQColoPicker = $(colorPicker);
            // jQColorPicker.spectrum({
            //   color: "#000000",
            //   flat: true,
            //   cancelText: "",
            //   showInput: true
            // });

            // Add the fadeout for the background.
            opacityBackground.setAttribute("id", "opacityBackground");
            opacityBackground.setAttribute("style", "position: absolute; width: 100%; height: 100%; top: 22px; background-color: rgba(0, 0, 0, 0.8); z-index: 999999999999999999998;");
            opacityBackground.onclick = () => {
              this.closeEmbedPopup();
            };


            document.body.appendChild(opacityBackground);

            // createRecentEmbedPopup(300);

            document.body.appendChild(popupWrapper);
          }
        }
		 

   getSettingsPanel() {
         BdApi.alert("BetaFeature","just wait...")
        }
      closeEmbedPopup() {
          try {
            document.getElementById("CommandUsageWrapper").remove();
          } catch (e) {}
          try {
            document.getElementById("embedPreviewWrapper").remove();
          } catch (e) {}
          try {
            document.getElementById("recentEmbedsWrapper").remove();
          } catch (e) {}
          try {
            document.getElementById("opacityBackground").remove();
          } catch (e) {}
          oldProviderName = "";

          embedOpen = false;
        }

        hasPermission(permission) {
          var channelId = window.location.toString().split("/")[window.location.toString().split("/").length - 1];
          var channel = ZLibrary.DiscordAPI.Channel.from(ZLibrary.DiscordAPI.Channel.fromId(channelId));
          var permissions = channel.discordObject.permissions;

          var hexCode;

          // General
          if (permission == "generalCreateInstantInvite") hexCode = 0x1;
          if (permission == "generalKickMembers") hexCode = 0x2;
          if (permission == "generalBanMembers") hexCode = 0x4;
          if (permission == "generalAdministrator") hexCode = 0x8;
          if (permission == "generalManageChannels") hexCode = 0x10;
          if (permission == "generalManageServer") hexCode = 0x20;
          if (permission == "generalChangeNickname") hexCode = 0x4000000;
          if (permission == "generalManageNicknames") hexCode = 0x8000000;
          if (permission == "generalManageRoles") hexCode = 0x10000000;
          if (permission == "generalManageWebhooks") hexCode = 0x20000000;
          if (permission == "generalManageEmojis") hexCode = 0x40000000;
          if (permission == "generalViewAuditLog") hexCode = 0x80;
          // Text
          if (permission == "textAddReactions") hexCode = 0x40;
          if (permission == "textReadMessages") hexCode = 0x400;
          if (permission == "textSendMessages") hexCode = 0x800;
          if (permission == "textSendTTSMessages") hexCode = 0x1000;
          if (permission == "textManageMessages") hexCode = 0x2000;
          if (permission == "textEmbedLinks") hexCode = 0x4000;
          if (permission == "textAttachFiles") hexCode = 0x8000;
          if (permission == "textReadMessageHistory") hexCode = 0x10000;
          if (permission == "textMentionEveryone") hexCode = 0x20000;
          if (permission == "textUseExternalEmojis") hexCode = 0x40000;
          // Voice
          if (permission == "voiceViewChannel") hexCode = 0x400;
          if (permission == "voiceConnect") hexCode = 0x100000;
          if (permission == "voiceSpeak") hexCode = 0x200000;
          if (permission == "voiceMuteMembers") hexCode = 0x400000;
          if (permission == "voiceDeafenMembers") hexCode = 0x800000;
          if (permission == "voiceMoveMembers") hexCode = 0x1000000;
          if (permission == "voiceUseVAD") hexCode = 0x2000000;

          return (permissions & hexCode) != 0;
        }


      };
    };
    return plugin(Plugin, Api);
  })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/
