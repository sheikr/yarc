/*
 * Yarc - Yet another Remote Control (for Kodi)
 * Copyright (C) 2015 by Esra Kummer
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 */

//that Intervals run only once, also after Pageswitch
var zeroInit = false;

var yCore = {	
	//set player at first as none, will by updated by yCore.getActivePlayer
	activePlayer: -1, //0=Music 1=Video
	deviceBeta: 0,
	deviceGamma: 0,
	totalPlayTimeSeconds: 0,
	currentPlayTimeSeconds: 0,
	doeOnPause: false, //checks is device orientation is on pause, needs to be global, since function is run every some milli seconds newly
	init: function(){
 		yS.localStorageInit();  //if some settings are not made, set default	
		
		document.title = yS.yS.kodiName; //set windwotitle according to setting
		
		if(yS.yS.hideMenuText){$(".yheadermenuitem").remove();}
		
		if(!zeroInit){setInterval(yCore.getActivePlayer, 1000);} //check active player each second
		if(!zeroInit){setInterval(yCore.getPlayerGetItem, 1000);} //check playing item each second
		if(!zeroInit){yCore.deviceOriantionService();}
		if(!zeroInit){yCore.keyDownService();}
   
		zeroInit = true; //that Intervals run only once, also after Pageswitch
		
		yCore.translate();   
        
       
	},
	//get active player and save it
	getActivePlayer: function(){
		yCore.sendJsonRPC(
			'GetActivePlayers',	
			'{ "jsonrpc": "2.0", "method": "Player.GetActivePlayers", "id": 1 }',
			function(resultGetActivePlayers){
				//"error" in resultGetItem
				if(resultGetActivePlayers["result"].length === 0){
					yCore.activePlayer = -1;
					
					$(".seek-bubble").hide();
					$(".footerImage").hide();
					$(".footerTitle").text("");
					$(".footerTime").text("");
					$(".footer").css( "background-size", "100% 100%" );
				} else {
					yCore.activePlayer = resultGetActivePlayers["result"]["0"]["playerid"];
				}
			}
		);
	},
	//get palying item and write it into footer
	getPlayerGetItem: function(){
		if(yCore.activePlayer != -1 && yFooter.footerVisible){ //only run if footer visible and and a player is active
			yCore.sendJsonRPC( //get time for footer
				'GetProperties',
				'{"jsonrpc":"2.0","method":"Player.GetProperties", "params": { "playerid": '
					+ yCore.activePlayer + ', "properties": ["time", "totaltime", "percentage"] }, "id": 1}',
				function(resultGetProperties){   // true if "error" doesn't exist in object
					if(!("error" in resultGetProperties)){
								
						$(".footerTime").html(yTools.addZeroTwoDigits(resultGetProperties["result"]["time"]["hours"]) 
							+ ":" + yTools.addZeroTwoDigits(resultGetProperties["result"]["time"]["minutes"]) 
							+ ":" + yTools.addZeroTwoDigits(resultGetProperties["result"]["time"]["seconds"])
							+ "<br>" + yTools.addZeroTwoDigits(resultGetProperties["result"]["totaltime"]["hours"])
							+ ":" + yTools.addZeroTwoDigits(resultGetProperties["result"]["totaltime"]["minutes"])
							+ ":" + yTools.addZeroTwoDigits(resultGetProperties["result"]["totaltime"]["seconds"])
						);
						
						//needed for seek function to calc time difference
						yCore.currentPlayTimeSeconds = resultGetProperties["result"]["time"]["hours"] * 3600
							+ resultGetProperties["result"]["time"]["minutes"] *60
							+ resultGetProperties["result"]["time"]["seconds"];
						
						yCore.totalPlayTimeSeconds = resultGetProperties["result"]["totaltime"]["hours"] * 3600
							+ resultGetProperties["result"]["totaltime"]["minutes"] *60
							+ resultGetProperties["result"]["totaltime"]["seconds"];
						$(".footer").css( "width", resultGetProperties["result"]["percentage"] + "%");
						$(".footer").css( "background-color", "#685300");
						if(!yFooter.isDragging){
                            var bubblePercentage = ($(window).width() * resultGetProperties["result"]["percentage"] / 100) - 25 ;                         
                            $(".seek-bubble").css( "left", bubblePercentage);
                        }
					} else { //if "error" exists set props that nothing is in it
						$(".seek-bubble").hide();
						$(".footerImage").hide();
						$(".footerTitle").text("");
						$(".footerTime").text("");
						$(".footer").css( "width", "0%");
					}
				}
			);				
			
			//get playing item details for footer
			yCore.sendJsonRPC(
				'GetItem',
				'{ "jsonrpc": "2.0", "method": "Player.GetItem", "params": { "playerid": '
						+ yCore.activePlayer + ', "properties": [ "title", "showtitle", "artist", "thumbnail", "streamdetails", "file", "season", "episode"] }, "id": 1 }',
				function(resultGetItem){
					if(!("error" in resultGetItem)){// if "error" is not in return set info
                        
                        var label = "";//only set label if titel is not there and info in label
						if(resultGetItem["result"]["item"]["title"] == ""){ 
							label = " " +resultGetItem["result"]["item"]["label"];
						}
						
						var showdetails = "";//only set tv show details if present
						if(resultGetItem["result"]["item"]["type"] == "episode"){
							showdetails = " (" + resultGetItem["result"]["item"]["showtitle"] 
                                            + " " + resultGetItem["result"]["item"]["season"] 
                                            + "x" + resultGetItem["result"]["item"]["episode"]
                                            + ")";
						} 
						
						if (yCore.activePlayer == 1){ //Video Player
							if(yFooter.bubbleSetVisible)$(".seek-bubble").show();
							$(".footerTitle").text(resultGetItem["result"]["item"]["title"] + label + showdetails);
							if(!yS.yS.hidePrevPics){
								$(".footerImage").attr("src", yTools.imageUrlNormalizer(resultGetItem['result']['item']['thumbnail'], "?"));
							}
							$(".footerImage").show();
							$(".footerTitle").show();
						} else if (yCore.activePlayer == 0) { //Musik Player
							if(yFooter.bubbleSetVisible)$(".seek-bubble").show();
							if(!yS.yS.hidePrevPics){
                                $(".footerImage").attr("src",  yTools.imageUrlNormalizer(resultGetItem['result']['item']['thumbnail'], "?"));
							}
							var artist = "";
                            if (resultGetItem["result"]["item"]["artist"].length !== 0) {
                                artist = " (" +  resultGetItem["result"]["item"]["artist"] + ") ";
                              
                            }
							
							$(".footerTitle").text(resultGetItem["result"]["item"]["title"]  + artist + label);
							$(".footerImage").show();
							$(".footerTitle").show();
						} else {//other Player
							if(yFooter.bubbleSetVisible)$(".seek-bubble").show();
							$(".footerTitle").text(resultGetItem["result"]["item"]["title"] + label);
							$(".footerImage").show();
							$(".footerTitle").show();
						}
						//if footer get's disabled while rpc call active, hide footer content
						if(!yFooter.footerVisible){$(".footerImage").hide();$(".footerTitle").hide();$(".footerTime").hide();}
					} else { //if "error" exists set props that nothing is in it
						$(".seek-bubble").hide();
						$(".footerImage").hide();
						$(".footerTitle").text("");
						$(".footerTime").text("");
					}
				}
			);
		}
	},
	/*
	 * translate interface. for some fields there is special handling needed
	 */
	translate: function(){
		//go throug all "Yarc TranSlate"-span-tags and set text according to constant and chosen langugage
		$('[data-yts]').each(function() {
			$(this).html(yTools.ts($(this).attr("data-yts")));
		});
		
		//if the language is not english and the according page is active translate. otherwise the english default in the html stays
		if(yS.yS.language != "en"){
				
			if($(location).attr('hash') == ""){
				$("#SendTextField").attr("placeholder", yTools.ts("SEND_TEXT"));
			}
			
			if($(location).attr('hash') == "#movies"){
				$("#searchMovies").attr("placeholder", yTools.ts("SEARCH_MOVIE"));
				
				$('#genreSelect option[value="all"]').text(yTools.ts("SELECT_OPTION_ALL_GENRES"));
				if($('#genreSelect').val()=="all"){$("#genreSelect").val("all").selectmenu('refresh', true);}
				
				$('#languageSelect option[value="all"]').text(yTools.ts("SELECT_OPTION_ALL_LANGS"));
				if($('#languageSelect').val()=="all"){$("#languageSelect").val("all").selectmenu('refresh', true);}
			}
			
			if($(location).attr('hash') == "#music"){
				$("#searchMusic").attr("placeholder", yTools.ts("SEARCH_ALBUM_ARTIST"));
				
				$('#genreSelectMusic option[value="all"]').text(yTools.ts("SELECT_OPTION_ALL_GENRES"));
				if($('#genreSelectMusic').val()=="all"){$("#genreSelectMusic").val("all").selectmenu('refresh', true);}
			}
			
			if($(location).attr('hash') == "#music-songsearch"){
				$("#songsearch-searchfield").attr("placeholder", yTools.ts("SEARCH_SONGTITLE"));
			}
			
			if($(location).attr('hash') == "#addons"){
				$("#SendTextFieldAddon").attr("placeholder", yTools.ts("SEND_TEXT"));
		
				$("#searchAddon").attr("placeholder", yTools.ts("SEARCH_ADDON"));
				
				$('#addonSelect option[value="all"]').text(yTools.ts("SELECT_OPTION_ALL_PLUGINS"));
				if($('#addonSelect').val()=="all"){$("#addonSelect").val("all").selectmenu('refresh', true);}
				
				$('#addonSelect option[value="video"]').text(yTools.ts("VIDEO"));
				if($('#addonSelect').val()=="video"){$("#addonSelect").val("video").selectmenu('refresh', true);}
				
				$('#addonSelect option[value="audio"]').text(yTools.ts("AUDIO"));
				if($('#addonSelect').val()=="audio"){$("#addonSelect").val("audio").selectmenu('refresh', true);}
				
				$('#addonSelect option[value="other"]').text(yTools.ts("SELECT_OPTION_OTHER"));
				if($('#addonSelect').val()=="other"){$("#addonSelect").val("other").selectmenu('refresh', true);}
			}
		}
	},	
	/*
	 * Checks for support of DeviceOrientation and if supported sets a timer to check position and fire according instructions
	 * if no support it hides on/off button
	 */
	deviceOriantionService: function(){
		//Find our div containers in the DOM
		var dataContainerOrientation = document.getElementById('dataContainerOrientation');
		
		//Check for support for DeviceOrientation event
		if(window.DeviceOrientationEvent && !yS.yS.hideOrientNav) {
			window.addEventListener('deviceorientation', function(event) {
				if($('#devOrient option:selected').attr('value') == "on"){
					//yCore.deviceAlpha = event.alpha;
					var scaler = 2;
					
					if(navigator.userAgent.indexOf("Firefox") >=0){
							scaler = 1;
					}
					yCore.deviceGamma = event.gamma / scaler;
					yCore.deviceBeta = event.beta;
					
					// for debuggin of Device orientation debugging needs according out-commented part in html
					//if(yCore.deviceAlpha!=0 || yCore.deviceBeta!=0 || yCore.deviceGamma!=0)//only do, if there is real data
					//dataContainerOrientation.innerHTML = 'beta: ' + event.beta + '<br />gamma: ' + event.gamma;
				}
			}, false);
			setInterval(function(){
				if($('#devOrient option:selected').attr('value') == "on"){
					radioNav_Med = $("input[name='nav-med']:checked").val();
					
					if( yCore.deviceGamma <= 20 && yCore.deviceGamma >= -20 && yCore.deviceBeta >= 170 && yCore.deviceBeta <= 179 && !yCore.doeOnPause){
						yRemote.playercontrol("Player.PlayPause");
						yCore.doeOnPause = true;
					}
					else if(yCore.deviceBeta >= 10 && yCore.deviceBeta <= 75 && yCore.doeOnPause){
						if(yCore.doeOnPause){
							yRemote.playercontrol("Player.PlayPause");
							yCore.doeOnPause = false;
						}
					}
					else if(yCore.deviceBeta >= 80 && !yCore.doeOnPause){
						yRemote.simpleJsonRequest("Input.Up");
					}
					else if( yCore.deviceBeta <= -5 && !yCore.doeOnPause){
						yRemote.simpleJsonRequest("Input.Down");
					}
					else if(yCore.deviceGamma <= -30 && yCore.deviceGamma >= -80 && !yCore.doeOnPause){
						yRemote.simpleJsonRequest("Input.Left");
					}
					else if(yCore.deviceGamma >= 30 && yCore.deviceGamma <= 80 && !yCore.doeOnPause){
						yRemote.simpleJsonRequest("Input.Right");
					}
				}
			}, 450);
		} else {
				$("#devOrientBlock").hide(); //hide if not supported
		}
	},
	/*
	 * Binds Event for keydown which checks if there is any input
	 */
	keyDownService: function(){//set a key map to check keyboard input
		var keymap = {8: false, 13: false, 16: false, 37: false, 38: false, 39: false, 40: false, 67: false, 81: false, 87: false};
		//           (8)back	 (13)enter	(16)shift  (37)left		(38)up	   (39)right	(40)down   (67)c      (81)q      (87)w			
		
		//on keyboard input, check if it matches the keymap and if it is the case start according function 
		$(document).keydown(function(e) { 
			
			/*for search field in song-search page.  needs to be here, because of document keydown. */
			if (e.keyCode == 13 && $(e.target).is("#songsearch-searchfield")) {
				$('#songsearch-list').empty();
				ySongSearch.searchPrintSong($("#songsearch-searchfield").val());
				$(e.target).blur();
				return false;
			}
			if (e.keyCode == 13 && $(e.target).is("#SendTextField")) {
				yRemote.sendTextButton($('#SendTextField').val());
				$(e.target).blur();
				return false;
			}
			if (e.keyCode == 13 && $(e.target).is("#SendTextFieldAddon")) {
				yRemote.sendTextButton($('#SendTextFieldAddon').val());
				$(e.target).blur();
				return false;
			}
			
			//if "enter" is pressend and being in a text (most of them) field, exit textfield to close onscreen keyboards on mobiles
			if (e.keyCode == 13 && 
					($(e.target).is("#xbmcName")
					||$(e.target).is("#searchMovies")
					||$(e.target).is("#searchMusic")
					||$(e.target).is("#searchAddon"))
				) {
				$(e.target).blur();
				return false;
			}	
			
		if (e.keyCode in keymap) { 
		
			// stop using accesskeyr if typing in a input field
			if ($(e.target).is(":text") || $(e.target).is("#prevImgQualMovies") || $(e.target).is("#listLength")){ 
				return true;
			}
		
			keymap[e.keyCode] = true;
			
			if (keymap[16] && keymap[37]) {
				yRemote.playergoto("previous");
				return false;
			}
			if (keymap[16] && keymap[38]) {
				yRemote.playercontrol("Player.stop");
				return false;
			}
			if (keymap[16] && keymap[39]) {
				yRemote.playergoto("next");
				return false;
			}
			if (keymap[16] && keymap[40]) {
				yRemote.playercontrol("Player.PlayPause");						
				return false;
			}
			if (keymap[67]) {
				yRemote.simpleJsonRequest("Input.ContextMenu");
				return false;
			}
			if (keymap[81]) {
				yRemote.setVolume("Volume.Minus");
				return false;
			}
			if (keymap[87]) {
				yRemote.setVolume("Volume.Plus");
				return false;
			}
			if (keymap[8]) { 
				yRemote.simpleJsonRequest("Input.Back");
				return false;
			}
			if (keymap[13]) { 
				yRemote.simpleJsonRequest("Input.Select");
				return false;
			}
			if (keymap[37]) { 
				yRemote.simpleJsonRequest("Input.Left");
				return false;
			}
			if (keymap[38]) { 
				yRemote.simpleJsonRequest("Input.Up");
				return false;
			}
			if (keymap[39]) { 
				yRemote.simpleJsonRequest("Input.Right");
				return false;
			}
			if (keymap[40]) { 
				yRemote.simpleJsonRequest("Input.Down");
				return false;
			}
		}
		return true;
		}).keyup(function(e) {		
			if (e.keyCode in keymap) {
				keymap[e.keyCode] = false;
			}
		});	
	},
    addToKodiFavorites: function(title, type, path, thumbnail){
        var mediaPath = "";
        
        //if type is window (like a directory to open)
        if(type == "window"){
            mediaPath = '", "window":"video", "windowparameter":"' + path;
        } else {//else asume it's a playable madiafile
            mediaPath = '", "path":"' + path;
        }
      
        yCore.sendJsonRPC(
          'Add-Remove-Favourite',
          '{"jsonrpc": "2.0", "method": "Favourites.AddFavourite", "params": { "title": "' + title 
              + '", "type":"' + type 
              + mediaPath
              + '", "thumbnail":"' + thumbnail 
          + '"}, "id": 1}',
          ''
        );   
	},
	//function to send json request to kodi
	sendJsonRPC: function(name, data, success, async){
		jQuery.ajax({
			headers: { 
				'Accept': 'application/json',
				'Content-Type': 'application/json' 
			},
			type: "POST",
			async: async,
			'url': '/jsonrpc?' + name,
			'data': data,
			'dataType': 'json',
			'success': success
		});	
	}
}

var yRemote = {
	radioNavMed: "",
	init: function() {      	
		//if swipe area, show pannels, or hide them and show buttons instead
		if(yS.yS.noSwipe){
			$("#swipe").hide();
			$("#Volume").show();
			$("#navigation-arrows").show();
			$("#mediacontrol1").show();
		} else {
			$("#swipe").show();
			$("#Volume").hide();
			$("#navigation-arrows").hide();
			$("#mediacontrol1").hide();
		}
		
		//set swipe box hight according to setting
		$(".swipe-box").css( "height", yS.yS.swipeHight );
		
		/*-------------Swipe Area-------------------------*/
		
		//get if it should check for navigation, or media player control
		var radioNavMed = $("input[name='nav-med']:checked").val();
		
		$('.nav-med').click(function(){
			radioNavMed = $("input[name='nav-med']:checked").val();
			if(radioNavMed == "Nav"){
				$(".swipe-box").css( "background-color", "#666" );
			}else{
				$(".swipe-box").css( "background-color", "#444" );
			}
		});
		
		$('#swipe-help').click(function(){
			$('#detailspopupSwipe').popup('open');
		});
        
		//check for swipe inputs in swipe area with jquery.touchSwipe.js
		//depending on which section (navigation or player control) is activated, it starts the according functions
        $("#swipe").swipe( {
          swipeStatus:function(event, phase, direction, distance, duration, fingers){
            if (phase=="move") { //while the touch is happening
              
              if(distance % 10 == 0 && duration > 500){ //only do if over half a second. For every 5px of movement do 1 time the case              
                if(radioNavMed == "Nav"){
                  switch (direction){
                    case "up":
                            if(yS.yS.swapSwipeDirections){
                                yRemote.simpleJsonRequest("Input.Down");
                            } else {
                                yRemote.simpleJsonRequest("Input.Up");
                            }
                        break;
                    case "down":
                            if(yS.yS.swapSwipeDirections){
                                yRemote.simpleJsonRequest("Input.Up");
                            } else {
                                yRemote.simpleJsonRequest("Input.Down");
                            }
                        break;
                    case "left":
                            if(yS.yS.swapSwipeDirections){
                                yRemote.simpleJsonRequest("Input.Right");
                            } else {
                                yRemote.simpleJsonRequest("Input.Left");
                            }
                        break;
                    case "right":
                            if(yS.yS.swapSwipeDirections){
                                yRemote.simpleJsonRequest("Input.Left");
                            } else {
                                yRemote.simpleJsonRequest("Input.Right");
                            }
                        break;
                    default:
                        break;
                  }    
                }
              }
            }
            if (phase=="end"){ 
              switch (direction){
					case "up":
						if(radioNavMed == "Nav"){
                            if(yS.yS.swapSwipeDirections){
                                yRemote.simpleJsonRequest("Input.Down");
                            } else {
                                yRemote.simpleJsonRequest("Input.Up");
                            }
						} else{
							yRemote.playercontrol("Player.stop");
						}
						break;
					case "down":
						if(radioNavMed == "Nav"){
                          if(yS.yS.swapSwipeDirections){
                              yRemote.simpleJsonRequest("Input.Up");
                          } else {
                              yRemote.simpleJsonRequest("Input.Down");
                          }
						} else{
							yRemote.playercontrol("Player.PlayPause");
						}
						break;
					case "left":
						if(radioNavMed == "Nav"){
                          if(yS.yS.swapSwipeDirections){
                              yRemote.simpleJsonRequest("Input.Right");
                          } else {
                              yRemote.simpleJsonRequest("Input.Left");
                          }
						} else{
							yRemote.playergoto("previous");
						}
						break;
					case "right":
						if(radioNavMed == "Nav"){
                          if(yS.yS.swapSwipeDirections){
                              yRemote.simpleJsonRequest("Input.Left");
                          } else {
                              yRemote.simpleJsonRequest("Input.Right");
                          }
						} else{
							yRemote.playergoto("next");
						}
						break;
					default:
						break;
				}         
                        
            }
          },
          tap:function(event, target) {
              if(radioNavMed == "Nav"){yRemote.simpleJsonRequest("Input.Select");} else{yRemote.setVolume("Volume.Minus");}
          },
          doubleTap:function(event, target) {
              if(radioNavMed == "Nav"){yRemote.simpleJsonRequest("Input.Back");} else{yRemote.setVolume("Volume.Plus");}
          },
          longTap:function(event, target) {
              if(radioNavMed == "Nav"){yRemote.simpleJsonRequest("Input.ContextMenu");} else{yRemote.setVolume("Application.SetMute");}
          },
          threshold:1, //how far has the finger to swipe, that it is not a tap anymore //35
          doubleTapThreshold:500, //how much time can pass in max between tabs, that it is a double tap
          maxTimeThreshold:1,//5000
          fingers:'all'
        });
		
		/*-------------Index Page - Media Control Buttons-------------------------*/
		
		$(".playercontrol").click(function(e) {
			e.stopImmediatePropagation();				 //needed that it binds not miltiple times
			yRemote.playercontrol($(this).attr('data-yJsonFunction'));
		});
				
		$(".playerSetSpeed").click(function(e) { 
			e.stopImmediatePropagation();	
			yRemote.setSpeed($(this).attr('data-yJsonFunction'));
		});
		
		$("#SetRepeat").click(function(e) { 
			e.stopImmediatePropagation();	
			yRemote.setRepeat();
		});
		
		$("#SetShuffle").click(function(e) { 
			e.stopImmediatePropagation();	
			yRemote.setShuffle();
		}); 

		$(".playergoto").click(function(e) { 
			e.stopImmediatePropagation();
			yRemote.playergoto($(this).attr('data-yJsonFunction'));
		});
		
		/*-------------Index Page - Navigation Controll Buttons-------------------------*/

		$(".navcontrol").click(function(e) {
			e.stopImmediatePropagation();
			yRemote.simpleJsonRequest($(this).attr('data-yJsonFunction'));
		});
		
		
		$("#toggleFullscreen").click(function(e) {
			e.stopImmediatePropagation();
			yRemote.toggleFullscreen();
		});
		

		/*-------------Index Page - Input - Send Text -------------------------*/

		$("#SendTextButton").click(function(e) {
			e.stopImmediatePropagation();
			yRemote.sendTextButton($('#SendTextField').val());
		});

		/*-------------Index Page - Input - Volume Range -------------------------*/
		$(".volume-group").click(function(e) {
			e.stopImmediatePropagation();
			yRemote.setVolume($(this).attr('data-yJsonFunction'));
		});

		/*-----------------------------------------------------------------------------------
		* ---------------------------- Tools -----------------------------------------------
		* ----------------------------------------------------------------------------------*/

		/*-------------  Index Page - Input - Send URL     -----------------------*/
		$("#popupCancel").click(function(e) {
			e.stopImmediatePropagation();
			$('#detailspopupRemote').popup("close");
		});
		
		$("#detailspopupSwipeClose").click(function(e) {
			e.stopImmediatePropagation();
			$('#detailspopupSwipe').popup("close");
		});		
		
		/*-------------Index Page - cleanAndUpdate  Clean and Update Audio and Video Library  -------------------------*/
		$(".cleanAndUpdate").click(function(e) {
			e.stopImmediatePropagation();
			yRemote.cleanAndUpdate($(this).attr('data-yJsonFunction'));
		});
		
		$("#yarcDemoVid").click(function(e) {
			e.stopImmediatePropagation();
			yCore.sendJsonRPC(
					'PlayerOpen',
					'{"jsonrpc": "2.0", "method": "Player.Open", "params":{"item": {"file" : "plugin://plugin.video.youtube/?action=play_video&videoid=' 
						+ 'yltMcKJFewE" }}, "id" : "1"}',
					' '
			);
		});
		

		/*-------------Index Page - Shutdown Buttons-------------------------*/

		$("#quit").click(function(e) {
			e.stopImmediatePropagation();
			e.preventDefault(); //preventing popup to colse automatically
			$('#detailspopupRemote').popup('open');
		});
		
		$("#popupCancel").click(function(e) {
			e.stopImmediatePropagation();
			$('#detailspopupRemote').popup("close");
		});
		
		$(".popupSHRS").click(function(e) { //SHRS: Suspend, Hibernate, Reboot, Shutdown
			e.stopImmediatePropagation();
			yRemote.simpleJsonRequest($(this).attr("data-yJsonFunction"));
		});

	},/*   / init   */
	
	playercontrol: function(actionname) {	
		yCore.sendJsonRPC(
			'StopPause',
			'{"jsonrpc": "2.0", "method": "' + actionname + '", "params": { "playerid": ' + yCore.activePlayer + ' }, "id": 1}',
			' '
		);
	},
	playergoto: function(actionname) {
		yCore.sendJsonRPC(
			'playergoto',
			'{"jsonrpc": "2.0", "method": "Player.GoTo", "params": { "playerid": ' + yCore.activePlayer + ', "to": "' + actionname + '"}, "id": 1}',
			' '
		);
	},
	setSpeed: function(direction) {
		yCore.sendJsonRPC(
			'setSpeed',
			'{"jsonrpc": "2.0", "method": "Player.SetSpeed", "params": { "playerid": ' + yCore.activePlayer + ', "speed": "' + direction  +'" }, "id": 1}',
			' '
		);
	},
	setRepeat: function() {//get Repeate status and switch to the next according to current mode. Then update Button
		yCore.sendJsonRPC(
			'GetProperties-repeat',	
			'{"jsonrpc":"2.0","method":"Player.GetProperties", "params": { "playerid": '
				+ yCore.activePlayer + ', "properties": ["repeat","canrepeat"] }, "id": 1}',
			function(resultGetProperties){   // true if "error" doesn't exist in object
				if(resultGetProperties["result"]["repeat"] == "all"){
					yCore.sendJsonRPC(
						'SetRepeat-one',
						'{"jsonrpc": "2.0", "method": "Player.SetRepeat", "params": { "playerid": ' + yCore.activePlayer + ', "repeat": "one" }, "id": 1}',
						' '
					);
					document.getElementById('SetRepeat').innerHTML = "<span class='fa fa-refresh'></span>1";
				} else if (resultGetProperties["result"]["repeat"] == "one"){
					yCore.sendJsonRPC(
						'SetRepeat-off',
						'{"jsonrpc": "2.0", "method": "Player.SetRepeat", "params": { "playerid": ' + yCore.activePlayer + ', "repeat": "off" }, "id": 1}',
						' '
					);
					document.getElementById('SetRepeat').innerHTML = "<span class='fa fa-refresh'></span>off";			
				} else {
					yCore.sendJsonRPC(
						'SetRepeat-all',
						'{"jsonrpc": "2.0", "method": "Player.SetRepeat", "params": { "playerid": ' + yCore.activePlayer + ', "repeat": "all" }, "id": 1}',
						' '
					);
					document.getElementById('SetRepeat').innerHTML = "<span class='fa fa-refresh'></span>all";
				}
			}
		);	
	},
	setShuffle: function() {//get Shuffled status and toggle mode. Then update Button.
		yCore.sendJsonRPC(
			'GetProperties-shuffled',	
			'{"jsonrpc":"2.0","method":"Player.GetProperties", "params": { "playerid": '
				+ yCore.activePlayer + ', "properties": ["shuffled","canrepeat"] }, "id": 1}',
			function(resultGetProperties){
				if(resultGetProperties["result"]["shuffled"] == false){
					yCore.sendJsonRPC(
						'SetShuffle-one',
						'{"jsonrpc": "2.0", "method": "Player.SetShuffle", "params": { "playerid": ' + yCore.activePlayer + ', "shuffle": true }, "id": 1}',
						' '
					);
					document.getElementById('SetShuffle').innerHTML = "<span class='fa fa-random'></span>on";
				} else {
					yCore.sendJsonRPC(
						'SetShuffle-all',
						'{"jsonrpc": "2.0", "method": "Player.SetShuffle", "params": { "playerid": ' + yCore.activePlayer + ', "shuffle": false }, "id": 1}',
						' '
					);
					document.getElementById('SetShuffle').innerHTML = "<span class='fa fa-random'></span>off";
				}
			}
		);
	},	
	simpleJsonRequest: function(actionname) {
		yCore.sendJsonRPC(
			'simpleJsonRequest',
			'{"jsonrpc": "2.0", "method": "' + actionname + '", "id": 1}',
			' '
		);
	},
	sendTextButton: function(sendText) {
		yCore.sendJsonRPC(
			'SendText',
			'{"jsonrpc": "2.0", "method": "Input.SendText", "params": { "text": "' + sendText + '" }, "id": 1}',
			' '
		);
	},	
	setVolume: function(actionname) {
		if(actionname=="Application.SetMute"){
			yCore.sendJsonRPC(
				'SetMute',
				'{"jsonrpc": "2.0", "method": "Application.SetMute", "params": {"mute":"toggle"}, "id": 1}',
				function(resultSetMute){
					if(resultSetMute["result"] == true){
						document.getElementById('SetMute').innerHTML = "<span class='fa fa-volume-off'></span>";
					} else {
						document.getElementById('SetMute').innerHTML = "<span class='fa fa-volume-up'></span>";
					}
				}
			);
		} else {
			var Volume = -1;
			yCore.sendJsonRPC(
				'GetProperties',
				'{"jsonrpc":"2.0","method":"Application.GetProperties","params":{"properties":["volume"]},"id":"1"}',
				function(resultGetVolume){
					Volume = resultGetVolume["result"]["volume"];	
					
					if(actionname=="Volume.Plus"){
						Volume += 10;
					} else if (actionname=="Volume.Minus"){
						Volume -= 10;
					} 
					yCore.sendJsonRPC(
						'SetVolume',
						'{"jsonrpc": "2.0", "method": "Application.SetVolume", "params": { "volume": ' + Volume + ' }, "id": 1}',
						' '
					);
				}
			);
		}
	},	
	toggleFullscreen: function(){
		yCore.sendJsonRPC(
			'SetFullscreen',
			'{"jsonrpc": "2.0", "method": "GUI.SetFullscreen", "params": { "fullscreen": "toggle" }, "id": 1}',
			' '
		);
	},
	cleanAndUpdate: function(actionname) { //for buttons to clean or update libraries
		yCore.sendJsonRPC(
			'cleanOrUpdateLibrary',
			'{"jsonrpc":"2.0","method":"' + actionname + '","id":1}',
			' '
		);
	},
}

/*
 * manages everything on playlist-page
 */
var yPl = {
	isDragged: false, //gets set, if a pl-list item is draged to recognise clicks
	currentItem: "",
    plItem: "",
	currentItemSongId: "",
    currentItemFilepath: "",
	init: function(){
		if(yCore.activePlayer != -1){ //if there is an active Player, activate according playlist
			$("input[name='plType']").filter('[value=' + yCore.activePlayer + ']').prop('checked', true);
		} else {//else take the music playlist
			$("input[name='plType']").filter('[value=0]').prop('checked', true);
		}
		$(".plRadio").checkboxradio("refresh"); //refresh plType after setting it
	
		yPl.getPlaylist();
		
		$('.plRadio').click(function(e){
			e.stopImmediatePropagation();
			yPl.getPlaylist();
		});
		
		$("body").delegate(".plItem", "click", function(e){
			e.stopImmediatePropagation();
			yPl.goto($(this).attr('data-yplnr'));
		});
		
 		$("body").delegate(".plRemove", "click", function(e){
			e.stopImmediatePropagation();
			yPl.remove($(this).attr('data-yplnr'));
		});
		
		$("#plBack").click(function(e) {
			window.location.href = "#remote";
		});
		
		$("#plRefresh").click(function(e) {
			e.stopImmediatePropagation();
			yPl.getPlaylist();
		});
        
		$( "#currentplaylist" ).sortable({
			start: function( event, ui ) {
				event.stopImmediatePropagation();
				yPl.isDragged = false;
				$(ui.item).addClass('plItemDragging');
				yPl.currentItem = $(ui.item).attr('data-yplnr'); //remember which item is clicked or dragged
				yPl.currentItemSongId =  $(ui.item).attr('data-songid');
                
                //the item type to be added is different for videos and songs
                if( $("input[name='plType']:checked").val() == 0){
                    yPl.plItem = '{"songid" : ' + $(ui.item).attr('data-songid') + '}';   
                } else {
                    yPl.plItem = '{"file" : "' + $(ui.item).attr('data-yfilepath') + '"}';
                }
			},
			update: function( event, ui ) {
				event.stopImmediatePropagation();
				yPl.isDragged = true;
				yCore.sendJsonRPC(
					'PlayerRemove',
					'{"jsonrpc": "2.0", "method": "Playlist.Remove", "params": { "playlistid": ' + $("input[name='plType']:checked").val() + ', "position": '
                      + yPl.currentItem +'}, "id": 1}',
					function(resultPlaylistRemove){

						if("error" in resultPlaylistRemove){
							alert(yTools.ts("ALERT_CANT_REMOVE_PLAYING"));
						} else {
                           yCore.sendJsonRPC(
                              'PlaylistInsert',
                              '{"jsonrpc": "2.0", "method": "Playlist.Insert", "params": { "playlistid" :  ' + $("input[name='plType']:checked").val() +  ',"position":'
                                  + $(ui.item).index() + ', "item" :  ' + yPl.plItem + '}, "id": 1}',
                              ''
                          );
						}
						yPl.getPlaylist();
					}
				);
			},
			stop: function( event, ui ) {
				event.stopImmediatePropagation();
					if (!(yPl.isDragged)){//if it's a click on an item
						yPl.goto(yPl.currentItem);
					}
				$(ui.item).children().removeClass('plItemDragging'); //evt.item is here ul-list
			}
		});
	},
	getPlaylist: function(){
        $("#loading_pl").show();
	
		if($(location).attr('hash') != "#pl"){return true;} //don't get playlist if not on playlist page
		
		$("#currentplaylist").empty();
		var currentPlayingtitle = "";
		var currentPlayingSpeed = "";
		var isPlaying = "";
		
		yCore.sendJsonRPC(	//get playing title
			'GetItem-yPL-Player-currenttitle',
			'{ "jsonrpc": "2.0", "method": "Player.GetItem", "params": { "playerid": '+$("input[name='plType']:checked").val()
              +', "properties": ["title","file"] }, "id": 1 }',
			function(resultGetItem){
				if(!("error" in resultGetItem)){
					currentPlayingtitle = resultGetItem["result"]["item"]["file"];
				}
			}
		);
		
		yCore.sendJsonRPC(	//get playing speed
			'GetProperties-yPL',
			'{"jsonrpc":"2.0","method":"Player.GetProperties", "params": { "playerid": '
				+ $("input[name='plType']:checked").val() + ', "properties": ["speed"] }, "id": 1}',
			function(resultGetProperties){
				if(!("error" in resultGetProperties)){
					currentPlayingSpeed = resultGetProperties["result"]["speed"];
				}
			}
		);
			
		if($("input[name='plType']:checked").val() == "0"){ //if Musicplayer
			yCore.sendJsonRPC(
				'GetPLItemsAudio',						
				'{"jsonrpc": "2.0", "method": "Playlist.GetItems", "params": { "properties": ["title", "album", "artist", "duration", "thumbnail","file"], "playlistid": 0 }, "id": 1}',				
				function(resultPl){

					if(resultPl["result"]["limits"]["end"] == "0"){//check first if playlist empty
						$("#currentplaylist").append(
							"<li>" + yTools.ts("PL_EMPTY") + "</li>"
						);
					}
				
					for (var i = 0; i < (resultPl["result"]["limits"]["end"]); i++) {
                        var imagetag = "";		
                        if(!yS.yS.hidePrevPics){
                          imagetag = "<img class='simpleListPrevPic' alt='' src='"+ yTools.imageUrlNormalizer(resultPl["result"]["items"][i]["thumbnail"], "?")
                              + "' />";
                        }
                      
						if(currentPlayingtitle == resultPl["result"]["items"][i]["file"]){
							if(currentPlayingSpeed == 0){
                                isPlaying = "<span class='fa fa-pause'></span> ";
							} else {
                                isPlaying = "<span class='fa fa-play'></span> ";
							}
						} else {
							isPlaying = "";
						}
						var minutes = Math.floor(resultPl["result"]["items"][i]["duration"] / 60);
						var seconds = resultPl["result"]["items"][i]["duration"] - minutes * 60;
						$("#currentplaylist").append(
							"<li class='plItem simpleList yListItem' data-yplnr='" + i + "' data-songid="+ resultPl["result"]["items"][i]["id"] +">"
                                + imagetag
                                + "<span class='bold' >" +isPlaying + yTools.addZeroTwoDigits(minutes) +":"+ yTools.addZeroTwoDigits(seconds) +"</span> "
                                + "<span>" + resultPl["result"]["items"][i]["title"] + "</span>"
                                + "<span class='italic'>(" + resultPl["result"]["items"][i]["artist"]  + ")</span>"
                                + "<span class='buttonRight'>"
                                    + "<button class='plRemove' data-yplnr='" + i + "' data-inline='true' data-theme='b' data-mini='true'>" 
                                        + "<i class='fa fa-times'></i> "
                                    + "</button>"
                                + "</span>"
							+ "</li>"
						).trigger( "create" );
					}
                    $("#loading_pl").hide();
				}
			);
		} else if($("input[name='plType']:checked").val() == "1"){ //if Videoplayer
			yCore.sendJsonRPC(
				'GetPLItemsVideos',							
				'{"jsonrpc": "2.0", "method": "Playlist.GetItems", "params": { "properties": [ "runtime", "showtitle", "season", "title", "artist", "thumbnail","file","episode" ], "playlistid": 1}, "id": 1}',
				function(resultPl){

					if(resultPl["result"]["limits"]["end"] == "0"){//check first if playlist empty
						$("#currentplaylist").append(
							"<li>" + yTools.ts("PL_EMPTY") + "</li>"
						);
					}

					for (var i = 0; i < (resultPl["result"]["limits"]["end"]); i++) {
                      
                        var imagetag = "";
                        if(!yS.yS.hidePrevPics){
                          imagetag = "<img class='simpleListPrevPic' alt='' src='"+ yTools.imageUrlNormalizer(resultPl["result"]["items"][i]["thumbnail"], "?")
                              + "' />";
                        }
                      
						if(currentPlayingtitle == resultPl["result"]["items"][i]["file"]){
							if(currentPlayingSpeed == 0){
								isPlaying = "<span class='fa fa-pause'></span> ";
							} else {
								isPlaying = "<span class='fa fa-play'></span> ";
							}
						} else {
							isPlaying = "";
						}
						var minutes = Math.floor(resultPl["result"]["items"][i]["runtime"] / 60);
						var seconds = resultPl["result"]["items"][i]["runtime"] - minutes * 60;

                        //items from the library have infos (icon title etc), in the else it's about plugins
						if(resultPl["result"]["items"][i]["showtitle"] == "" || resultPl["result"]["items"][i]["showtitle"] === undefined){
							$("#currentplaylist").append(
								"<li class='plItem simpleList yListItem' data-yfilepath='" + resultPl["result"]["items"][i]["file"] 
                                  + "' data-yplnr='" + i + "'>"
                                    + imagetag
									+ "<span class='bold'>" +isPlaying
										+ yTools.addZeroTwoDigits(minutes) +":"+yTools.addZeroTwoDigits(seconds) 
									+ "</span>"
									+ "<span>" + resultPl["result"]["items"][i]["title"] + "</span>"
									+ "<span class='buttonRight'><button class='plRemove' data-yplnr='" + i + "' data-inline='true' data-theme='b' data-mini='true'>" 
                                        + "<i class='fa fa-times'></i> "
									+ "</button></span>"
								+ "</li>"
							).trigger( "create" );
						} else {
							$("#currentplaylist").append(
								"<li class='plItem simpleList yListItem' data-yfilepath='" + resultPl["result"]["items"][i]["file"] 
                                  + "' data-yplnr='" + i + "'>"
                                    + imagetag
									+ "<span class='bold'>" +isPlaying
										+ yTools.addZeroTwoDigits(minutes) +":"+yTools.addZeroTwoDigits(seconds) 
									+ "</span>"
									+ "<span>" + resultPl["result"]["items"][i]["title"] + "</span>"
									+ "<span class='italic'>(" 
                                        + resultPl["result"]["items"][i]["showtitle"]  + " " 
                                        + resultPl["result"]["items"][i]["season"] + "x" + resultPl["result"]["items"][i]["episode"] 
                                    + ")</span>"
									+ "<span class='buttonRight'><button class='plRemove' data-yplnr='" + i + "' data-inline='true' data-theme='b' data-mini='true'>" 
                                        + "<i class='fa fa-times'></i> "
									+ "</button></span>"
								+ "</li>"
							).trigger( "create" );		
						}
					}
                    $("#loading_pl").hide();
				}
			);
		} else {
			//Space for other possible players
		}
		return true;
	},
    //first open according player and then open the wanted playlist item (plNumber)
	goto: function(plNumber){
		yCore.sendJsonRPC(
			'PlayerOpen',
			'{ "jsonrpc": "2.0", "method": "Player.Open", "params": {"item":{"playlistid":' + $("input[name='plType']:checked").val() + '}}, "id": 1 }',
			function(){
				yCore.sendJsonRPC(
					'PlayerGoto',
					'{"jsonrpc": "2.0", "method": "Player.GoTo", "params": { "playerid": ' + $("input[name='plType']:checked").val() + ', "to": '+plNumber+'}, "id": 1}',
					function(result){
							window.setTimeout(yPl.getPlaylist(),1000);
					}
				);
			}
		);
	},
	remove: function(plNumber){
		yCore.sendJsonRPC(
			'PlayerRemove',
			'{"jsonrpc": "2.0", "method": "Playlist.Remove", "params": { "playlistid": ' + $("input[name='plType']:checked").val() + ', "position": '+plNumber+'}, "id": 1}',
			function(resultPlaylistRemove){
				if("error" in resultPlaylistRemove){
					alert(yTools.ts("ALERT_CANT_REMOVE_PLAYING"));
				}
				window.setTimeout(yPl.getPlaylist(),1000);
			}
		);
	}
}

/*
 * All functions to show and hide footer info. the info get functions are in yCore
 */
var yFooter = { 
	footerVisible: false,
	isDragging: false,
	seekTime: [0,0,0], //hours, minutes, seconds
	bubbleSetVisible: false,
	startDragPlayTimeSeconds: 0,
	
	init: function() {

		if (!yFooter.footerVisible){
			$(".seek-bubble").hide();
			$(".footerImage").hide();
			$(".footerTitle").hide();
			$(".footerTime").hide();
		}

		$(".footer-left").click(function(e) {
			e.stopImmediatePropagation();
			
			if (!yFooter.footerVisible){
				yFooter.footerVisible = true;
				$(".footer-container").css( "width", "100%" );
				$(".footer").css( "height", "40px" );
				$(".footer-left").removeClass("footer-left-in");
				$(".footer-left").addClass("footer-left-out");

				if (yFooter.bubbleSetVisible)$(".seek-bubble").show();
				if(yCore.activePlayer != -1)$(".footerImage").show();
				$(".footerTime").show();					
				if(yCore.activePlayer != -1)$(".footerTitle").show();
			} else {
				yFooter.footerVisible = false;
				$(".footer-container").css( "width", "0px" );
				$(".footer").css( "height", "60px" );
				$(".footer-left").removeClass("footer-left-out");
				$(".footer-left").addClass("footer-left-in");

				$(".seek-bubble").hide();
				$(".footerImage").hide();
				$(".footerTitle").hide();
				$(".footerTime").hide();
			}
		});
		
		$(".footer-container").click(function(e) {
			e.stopImmediatePropagation();
			if (!yFooter.bubbleSetVisible) {
				$(".seek-bubble").show();
			} else {
				$(".seek-bubble").hide();
			}
			yFooter.bubbleSetVisible = !yFooter.bubbleSetVisible;
		});
		
		$(".seek-bubble").draggable({
			axis: "x",
			start: function( event, ui ) {
				//save the current playing time at the start of draging for drag function
				yFooter.startDragPlayTimeSeconds = yCore.currentPlayTimeSeconds;
			},
			stop: function( event, ui ) {
                event.stopImmediatePropagation();
				yFooter.isDragging = false;
				
				$("#seek-overlay").html("&nbsp;");
				$("#seek-overlay").hide();
				
				yCore.sendJsonRPC(
					'PlayerSeek',
					'{"jsonrpc":"2.0","id":1,"method":"Player.Seek","params":{"playerid":' + yCore.activePlayer + ',"value":{"hours": ' + yFooter.seekTime[0] + ', "minutes": ' + yFooter.seekTime[1] +', "seconds": ' + yFooter.seekTime[2] + '}}}',
					''
				);
			},
			drag: function( event, ui ) {
				yFooter.isDragging = true;
				
				$("#seek-overlay").show();
				
				var offset = $(this).offset();
				//"accumulated seconds position where i am aiming now" = total time in seconds * "percentage of current place to windowwidth" / 100
				var newMediaPos = (yCore.totalPlayTimeSeconds * (((offset.left+25) * 100)/$(window).width()) / 100);
				
				var mediaPosDiff = "";
				var mediaPosPrefix = "";
				
				if(yFooter.startDragPlayTimeSeconds < newMediaPos ){
					mediaPosDiff = newMediaPos - yFooter.startDragPlayTimeSeconds;
					mediaPosPrefix = "+";
				} else {
					mediaPosDiff = yFooter.startDragPlayTimeSeconds - newMediaPos;
					mediaPosPrefix = "-";
				}
				
				yFooter.seekTime[0] = Math.floor(newMediaPos / 3600); //save hours
				yFooter.seekTime[1] = Math.floor((newMediaPos % 3600)/60); //save minutes
				yFooter.seekTime[2] =  Math.floor((newMediaPos % 3600) % 60); //save seconds
				
				$("#seek-overlay").html(yTools.addZeroTwoDigits(yFooter.seekTime[0]) + ":" + yTools.addZeroTwoDigits(yFooter.seekTime[1]) 
					+ ":" +  yTools.addZeroTwoDigits(yFooter.seekTime[2]) + "<br />" + mediaPosPrefix + ""
					+ yTools.addZeroTwoDigits(Math.floor(mediaPosDiff / 3600)) + ":" 
					+ yTools.addZeroTwoDigits(Math.floor((mediaPosDiff % 3600)/60)) + ":"
					+ yTools.addZeroTwoDigits(Math.floor((mediaPosDiff % 3600) % 60))
				);
			}
		});
	}
}

/*
 * All functions to get movie infos and the functions of the movie page
 */
var yMovies = {
	moviesJSON: "",
	genres: [],
	genreString: "",
	languages: [],
	documentReadyAlreadyRun: false,
	listPos: 0,
	listLength: 0,
	lastListItem: 0,
	firstListItem: [0],
	init: function() {
		
		if(yS.yS.hideSearchMovies){$("#searchMovies").parent().hide();} //hide movieSearch field if set in settings
		if(yS.yS.hideLanguageMovies){$("#languageSelect").parent().hide();} //hide language selection field if set in settings
		if(yS.yS.hideGenreMovies){$("#genreSelect").parent().hide();} //hide  genre selection  field if set in settings
		
		$("#popupTrailer").button();
        $("#popupPlay").button();
		
		if (!yMovies.documentReadyAlreadyRun){  //that it doesn't run twice
			yMovies.documentReadyAlreadyRun = 1;
			yMovies.getMovies();
		}		
		
		$("body").delegate(".openMovieItem", "click", function(e){  //set movie information in popup
			e.stopImmediatePropagation();	
			yMovies.openMovieItem($(this).attr('data-yMovieId'));	
		});

		$('#detailspopupMovies').bind({  // if popup is closed, remove picture path
			popupafterclose: function(event, ui) {
				$("#popupImageMovies").attr("src","resources/images/transparent.gif");
				$('#popupPlay').text(yTools.ts("PLAY")).button("refresh");
			}
		});
		
		$("#detailspopupMoviesClose").click(function(e) {
			e.stopImmediatePropagation();
			$('#detailspopupMovies').popup("close");
		});		

		$("body").delegate("#popupPlay", "click", function(e){ //start movie
			e.stopImmediatePropagation();
			yMovies.popupPlay($(this).attr('data-yMovieArrayNr'));
		});

		$("body").delegate("#popupTrailer", "click", function(e){ //start trailer to movie
			e.stopImmediatePropagation();
			yMovies.popupTrailer($(this).attr('data-yMovieArrayNr'));
		});
		
		$("#searchMovies").keyup(function() {
			$('#movie_list').empty(); //empty ul to update list with new choices
			$("#movie-flex-prev").empty();
			$("#movie-flex-next").empty();
			yMovies.firstListItem = [0]; //to get track of what was search to go back with button
			yMovies.createMovieList(0, $('#genreSelect option:selected').attr('value'),$('#languageSelect option:selected').attr('value'), $("#searchMovies").val()); 
		});
		
		$("body").delegate("#movieListPrev", "click", function(e){  //checkbox select/unselect reverser
			e.stopImmediatePropagation();
			yMovies.listPos = yMovies.firstListItem.pop(); //if one back, remove item from trail-array
			$("#movie_list").empty();
			$("#movie-flex-prev").empty();
			$("#movie-flex-next").empty();
			
			yMovies.createMovieList(yMovies.listPos, $('#genreSelect option:selected').attr('value'),$('#languageSelect option:selected').attr('value'), $("#searchMovies").val()); 
            
            //scroll to top
            $('html,body').animate({scrollTop: $("#movies").offset().top},'fast');
		});

		$("body").delegate("#movieListNext", "click", function(e){  //checkbox select/unselect reverser
			e.stopImmediatePropagation();
			yMovies.listPos = yMovies.lastListItem + 1; //befor creating new list remeber the position where to start
			
			//remember first item of list in trail-array to go back later
			yMovies.firstListItem.push(parseInt($( "#movie_list" ).children().eq(0).attr('data-yMovieId')));	
			
			$("#movie_list").empty();
			$("#movie-flex-prev").empty();
			$("#movie-flex-next").empty();
			yMovies.createMovieList(yMovies.listPos, $('#genreSelect option:selected').attr('value'),$('#languageSelect option:selected').attr('value'), $("#searchMovies").val());
            
            //scroll to top
            $('html,body').animate({scrollTop: $("#movies").offset().top},'fast');
		});           
	},
	/*
	 * Get movies from the library
	 */
	getMovies: function(){
		yCore.sendJsonRPC(
			'GetMovies',
			'{"jsonrpc": "2.0", "method": "VideoLibrary.GetMovies", "params": { "limits": { "start": 0 }, "properties": [ "plot", "trailer", "title", "runtime", "year", "genre", "rating", "thumbnail", "file", "playcount", "streamdetails"], "sort": { "method": "sorttitle", "ignorearticle": true }}, "id": 1}',				
			function(result){                
				yMovies.moviesJSON = result; //write result in Array for further use 
				yMovies.createMovieList(0, yS.yS.moviePageSettings.genreselect, yS.yS.moviePageSettings.languageSelect,$("#searchMovies").val());

				$('#genreSelect').change(function() {  //create Action Listener for list with selection choice
                    
                    //save change in settings
                    yS.yS.moviePageSettings.genreselect = $(this).val();
                    yS.saveSettingsToLocalStorage();
                    
					$('#movie_list').empty(); //empty ul to update list with new choices
                    $("#movie-flex-prev").empty();
                    $("#movie-flex-next").empty();
					yMovies.firstListItem = [0]; //if selection changed, start from the beginning
					//create movieslist accouding to options
					yMovies.createMovieList(0, $(this).val(), $('#languageSelect option:selected').attr('value'),$("#searchMovies").val()); 
				});

				$('#languageSelect').change(function() {  //create Action Listener for list with selection choice
                    
                    //save change in settings
                    yS.yS.moviePageSettings.languageSelect = $(this).val();
                    yS.saveSettingsToLocalStorage();
                  
					$('#movie_list').empty(); //empty ul to update list with new choices
                    $("#movie-flex-prev").empty();
                    $("#movie-flex-next").empty();
					yMovies.firstListItem = [0];//if selection changed, start from the beginning
					yMovies.createMovieList(0, $('#genreSelect option:selected').attr('value'),$(this).val(), $("#searchMovies").val()); //create movieslist according to options
				});
			}
		);
	},
	/*
	 * Set information to according movie in popup
	 */
	openMovieItem: function(movieNr) {
      
        $('#detailspopupMovies').popup();
        
		yMovies.genresToString(movieNr);
		
		var md_year = yMovies.moviesJSON["result"]["movies"][movieNr]["year"];
		if(md_year > 0){md_year = " (" + md_year + ")";}else{md_year="";}
		
		var	 md_runtime = Math.round(yMovies.moviesJSON["result"]["movies"][movieNr]["runtime"]/60);
		if (md_runtime > 0){md_runtime += "min";}else{ md_runtime = "unknown";}
		
		if(!yS.yS.hidePrevPics){
			$("#popupImageMovies").attr("src",yTools.imageUrlNormalizer(yMovies.moviesJSON["result"]["movies"][movieNr]["thumbnail"],"?"));
		} 
		
		if(yMovies.moviesJSON["result"]["movies"][movieNr]["playcount"]>0){
			$("#popupGreenTick").attr("src","resources/images/green_tick.png");
			$("#popupGreenTick").show();
		}
		else {
			$("#popupGreenTick").hide();
		}
		
		$("#popupTitleMovies").text(yMovies.moviesJSON["result"]["movies"][movieNr]["title"] + md_year);
        $("#popupRating").innerHTML = (yTools.ts("RATING") + ": "  + yTools.ratingToStars(yMovies.moviesJSON["result"]["movies"][movieNr]["rating"]));
		$("div#popupRuntimeMovies").text(yTools.ts("RUNTIME") + ": " + md_runtime);	
		$("div#popupGenreMovies").text(yTools.ts("GENRES") + ": " + yMovies.genreString);
		$("div#popupPlotMovies").text(yMovies.moviesJSON["result"]["movies"][movieNr]["plot"]);
        if(!yS.yS.hideLanguageMovies){
			$("#popupLanguagesFlags").innerHTML = yTools.pathToFlags(yMovies.moviesJSON["result"]["movies"][movieNr]["streamdetails"]["audio"]);
		}
		if(yMovies.moviesJSON["result"]["movies"][movieNr]["trailer"] == ""){ //if there is an empty trailer string
 			$("#popupTrailer").parent().hide();
		} else {
			$("#popupTrailer").attr("data-yMovieArrayNr", movieNr);
			$("#popupTrailer").parent().show();
		}
		
        $("#popupPlay").attr("data-yMovieArrayNr", movieNr);
        
		if(!yS.yS.hideFileLinkMovies){$("div#popupFilelink").text("Filelink: " + yMovies.moviesJSON["result"]["movies"][movieNr]["file"]);}
		$('#detailspopupMovies').popup('open');	
},	
	/*
	 * Function who runs in the beginning or if movielist changes
	 * and creates items in the list according to settings:
	 * which genre, which language, which search list term, what part of the list, if listitems per page reduced
	 */
	createMovieList: function(listStart, genre, language, searchval) {  //create movielist in DOM
		var selectedGenre = genre;
		var selectedLang = language;
		var movieGenreInItem;
		var langToCode= new Array(); //needed for language to languagecode translation
		var tempGenreLenth = yMovies.genres.length; //save length to check later if it is the first time to be updated
		
		itemsInList = 0; //needed to find out, how many items are shown, so that if list is restricted we know if next button has to be shown
		
		yMovies.listPos = listStart; //needed, that in initalaition by restriction, list starts at 0, but not if next or prev button
		
		
		//check if there is anything in the lib. eigther hide loading bar and show info
		if(yMovies.moviesJSON["result"]["limits"]["total"] == 0){
			$("#movie_list").append("<li><h3>" + yTools.ts("LIB_EMPTY") + "</h3></li>").trigger( "create" );
			$("#loading_movie").hide();
		} else {//or start list filling
			if(yS.yS.listLength > yMovies.moviesJSON["result"]["limits"]["end"]){
				yMovies.listLength = yMovies.moviesJSON["result"]["limits"]["end"];
			} else{
				yMovies.listLength = yS.yS.listLength;
			}
				
			//only show back button if it is not the start of the list
			if(yMovies.listPos != 0){		
				$("#movie-flex-prev").append(
					"<a id='movieListPrev' data-yMovieId='movieListPrev' class='flexListPrevNext'>"
                      +" <div class=''>" 
                          + "<div>"
                              + "<img class='moviePrevPicArrow' alt='Previous items' src='resources/images/listprev.png' />" 
                          + "</div>" 
                          + "<div>"
                              + "<h4>" + yTools.ts("BACK") +"</h4>"
                          + "</div>" 
                      + "</div>"
					+"</a>" 
				);	
				$("#movie-flex-prev").show(); 
			} else {$("#movie-flex-prev").hide(); }
				
			//all movies
			for (var i = 0; i < yMovies.moviesJSON["result"]["limits"]["end"]; i++) { 
				langToCode.length = 0;
				movieGenreInItem = false;
				var flags = ""; //set var new for each movie
				
				var m_filePath = yMovies.moviesJSON["result"]["movies"][i]["file"];
				
				
				/*
				 * There are two places, where it searches for language:
				 *  first the streamdetails form kodi, if there is something, add some additional data: 
				 * 			- the languages full name, 
				 * 			- which flag should be used to represent the language
				 * 			- and the isocode, for further reverence, if it is already added to streamdetails
				 * */
				
				if(!yS.yS.hideLanguageMovies){
					//add flag and "language-native" to streamdetails of the yarc internal movies-array
					for (var j=0;  j < yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"].length; j++){//run whole kodi-language list
						if (yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][j]["language"] in langCodeToDescFlag){//if code is in json
							var lang = yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][j]["language"]
							yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][j]["native"] = langCodeToDescFlag[lang]["native"];
							yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][j]["flag"] = langCodeToDescFlag[lang]["flag"];
							yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][j]["isocode"] = langCodeToDescFlag[lang]["iso639-2"];
							if ($("#languageSelect option[value=" + langCodeToDescFlag[lang]["iso639-2"] + "]").length == 0 ){
								$('#languageSelect').append("<option value='"	+ langCodeToDescFlag[lang]["iso639-2"] + "'>" 
                                    + langCodeToDescFlag[lang]["native"] + "</option>");
							}
							
						}
					}
					
					/*
					*  secondly, it searches for isocodes in the filename which has to be in brackets [], if there is found something, it also 
					*  addes the additional data into the streamdetails-audio (yarc internal only)
					*/
					if (m_filePath.indexOf("[") >= 0){//if there is no starting bracket in filepath, don't even try
						for (var code in langCodeToDescFlag) { //go trough every isocode in the list
                            if (m_filePath.toLowerCase().indexOf("["+code+"]") >= 0) {//if code is found in filename	
                                var codeIsSet = false;
                                for (var j=0;  j < yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"].length; j++){//go trough whole streamdetails-audio list
                                    if(langCodeToDescFlag[code]["iso639-2"] == yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][j]["isocode"]){//if code is already in streamdetails-audio...
                                        codeIsSet = true;//... remeber it to...
                                    }
                                }
                                if(!codeIsSet){//..not add it again to streamdetails list
                                    var streamdet = {
                                        native:langCodeToDescFlag[code].native,
                                        flag:langCodeToDescFlag[code].flag,
                                        isocode:langCodeToDescFlag[code]["iso639-2"]
                                    };//prepare object to be pushed into streamdetails-audio
                                    yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"].push(streamdet);//push object above
                                    if ( $("#languageSelect option[value=" + langCodeToDescFlag[code]["iso639-2"] + "]").length == 0 ){//if language is not in languageselect,
                                        $('#languageSelect').append("<option value='"+ langCodeToDescFlag[code]["iso639-2"] + "'>" + langCodeToDescFlag[code].native + "</option>");
                                    }
                                }
                            }
						}
					}
				}
				
				for (var j=0; j < yMovies.moviesJSON["result"]["movies"][i]["genre"].length; j++){ //all genres in movie
					if (!(jQuery.inArray(yMovies.moviesJSON["result"]["movies"][i]["genre"][j], yMovies.genres) > -1)){//push if not already there
						yMovies.genres.push(yMovies.moviesJSON["result"]["movies"][i]["genre"][j]);	
					} 
					//if movie is equal to the selected genre remember it.
					if (selectedGenre == yMovies.moviesJSON["result"]["movies"][i]["genre"][j]){ 
						movieGenreInItem = true;	 
					}
				}
				
				if(selectedGenre == "all" || movieGenreInItem){ //runs per movie if in genre selcet all or a matching genre is selected
                    var isocodeIsSelectedLang = false;
                    for (var k=0;  k < yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"].length; k++){//go trough whole audio info's
                        if(yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"][k]["isocode"] == selectedLang){
                            isocodeIsSelectedLang = true
                        }         
                    }

					if(selectedLang == "all" || isocodeIsSelectedLang){ //runs per movie if in language selcet all or a matching language is selected						
						//first check if searchfield Value is undefinde (no input yet) and then if the title is matching (in lowercase)
						if(searchval === undefined || yMovies.moviesJSON["result"]["movies"][i]["title"].toLowerCase().indexOf(searchval.toLowerCase()) != -1){
							
							//skip what should not be seen
							if(i >= yMovies.listPos && itemsInList < yMovies.listLength){
								
								var m_runtime = Math.round(yMovies.moviesJSON["result"]["movies"][i]["runtime"]/60);
								if (m_runtime > 0){m_runtime += "min";}else{ m_runtime = "unknown";} //makes runtime string if aviable
								
								var m_year = yMovies.moviesJSON["result"]["movies"][i]["year"];
								if (m_year < 1){m_year = "unknown";} //makes year string if unaviable
								
								if(yMovies.moviesJSON["result"]["movies"][i]["playcount"]>0){
									if(yS.yS.hideWatched){continue;}//if setting says to not show seen movies, go to next iteration
									var isSeen = "<img class='greenMovies' alt='Movie is seen' src='resources/images/green_tick.png' />";
								}
								else {var isSeen = "";} //add img tag if movie is registered as min. seen once
								
								if(!yS.yS.hideLanguageMovies){
									flags =  yTools.pathToFlags(yMovies.moviesJSON["result"]["movies"][i]["streamdetails"]["audio"]);
								} else {
									flags = "";
								}
								
								$("#movie_list").append(
									"<a class='openMovieItem' data-yMovieId='" + i + "'>"
                                      + "<div class='movieItem' data-yMovieId='" + i + "'>"
                                        + "<div>"
                                          + "<img class='moviePrevPic' alt='' src='" 
                                                  + yTools.imageUrlNormalizer(yMovies.moviesJSON["result"]["movies"][i]["thumbnail"], "?")
                                          + "' />"
                                          + isSeen 
                                        + "</div>" 
                                        + "<div>"
                                          + "<h4>" + yMovies.moviesJSON["result"]["movies"][i]["title"] + "</h4>"
                                          + "<p>" + yTools.ts("YEAR") + ": " + m_year + " " + yTools.ts("RUNTIME") + ": " + m_runtime + "</p>"
                                           + "<p>" + yTools.ts("RATING")+ ": "  + yTools.ratingToStars(yMovies.moviesJSON["result"]["movies"][i]["rating"]) + "</p>"
                                          + "<p>" + flags	+ "</p>"
                                        + "</div>" 
                                      + "</div>"
									+"</a>"
								);
								itemsInList++; 
								yMovies.lastListItem = i; //remember last item of the list
							}
						}
                    }
				}
					
                if(yS.yS.hidePrevPics){$(".moviePrevPic").remove();} //hide previmage if set in settings
                if(yS.yS.hidePrevPics){ //adjust position of greenMovie if movieprevpic not visible
                    $(".greenMovies").css("margin-top","0px");
                    $(".greenMovies").css("padding-left","calc(50% - 10px)");
                    $(".greenMovies").css("position","relative");
                } 
			}
				
            //only show if not at the end of the list, or no more items in the list to show
            if(!($(".openMovieItem").length < yS.yS.listLength)){	
                $("#movie-flex-next").append(
                    "<a id='movieListNext' data-yMovieId='movieListNext' class='flexListPrevNext'>"
                            +" <div class='movieItem' >" 
                                + "<div>"
                                    + "<img class='moviePrevPicArrow' alt='Next items' src='resources/images/listnext.png' />"  
                                + "</div>" 
                                + "<div>"
                                    + "<h4>" + yTools.ts("NEXT") +"</h4>"
                                    + "</div>" 
                                + "</div>"
                    +"</a>" 
                );
                $("#movie-flex-next").show();
            } else {$("#movie-flex-next").hide(); }

            if ( !$('#movie_list').children().length ){ //if there are no children, say so
                $("#movie_list").append(yTools.ts("NO_MATCH"));
            }
            
            $("#loading_movie").hide();
            
            if(tempGenreLenth <= 0){ //only populate if it is the first time
                yMovies.genres.sort()
                for (var i=0; i < yMovies.genres.length; i++){  //add genre Options to selection
                    $('#genreSelect').append("<option value='" + yMovies.genres[i] + "'>" + yMovies.genres[i] + "</option>");
                }
                
                //Sort Language select
                $('#languageSelect').append($("#languageSelect option").sort(function(a, b) {
                        var at = $(a).text(), bt = $(b).text();
                        return (at > bt)?1:((at < bt)?-1:0);
                }));
            }
            
            //set the selectbox according to setting
            $("#genreSelect").val(yS.yS.moviePageSettings.genreselect);
            $('#genreSelect').selectmenu('refresh');
            
            $("#languageSelect").val(yS.yS.moviePageSettings.languageSelect);
            $('#languageSelect').selectmenu('refresh');
        }//end else of check if there is something in the library
	},
	/*
	 * Writes gernes into a single sting for popup
	 */
	genresToString: function(movieNr){
		yMovies.genreString = ""; //empty, to remove previous content, to avoid wrong or multiple informations
		for (var j=0; j < yMovies.moviesJSON["result"]["movies"][movieNr]["genre"].length; j++){ //all genres in movie
			yMovies.genreString += yMovies.moviesJSON["result"]["movies"][movieNr]["genre"][j];
			if (j !=  (yMovies.moviesJSON["result"]["movies"][movieNr]["genre"].length -1)) { yMovies.genreString += ", "; }
		}
		if (yMovies.genreString==""){yMovies.genreString+="unknown"};			
	},
	/*
	 * start movie
	 */
	popupPlay: function(movieNr){
		$('#popupPlay').text(yTools.ts("LOADING")).button("refresh"); // change button text because of long JSON Call time
		yCore.sendJsonRPC(
			'PlayerOpen',
			'{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "movieid": '
			+ yMovies.moviesJSON["result"]["movies"][movieNr]["movieid"] + ' } }, "id": 1 }',
			function(){window.location.href = "#remote";}
		);
	},	
	/*
	 * watch trailer for movie
	 */
	popupTrailer: function(movieNr){
		$('#popupTrailer').text(yTools.ts("LOADING")).button("refresh"); // change button text because of long JSON Call time
		yCore.sendJsonRPC(
			'PlayerOpen',
			'{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "file":  "' 
				+ yMovies.moviesJSON["result"]["movies"][movieNr]["trailer"] + '" } }, "id": 1 }',
			function(){$('#popupTrailer').text(yTools.ts("TRAILER")).button("refresh");}
		);
	}
}

/*
 * All functions to get Tv-show infos and the functions of the series page
 */
var ySeries = {
	TVShowID: "",
	already_run: false, 
	episodeDetails: new Array(),
	init: function() {
		
		if (!ySeries.already_run){  //that it doesn't run twice
		ySeries.already_run = true; 
        
        $("#popupPlaySeries").button();
		$("#popupAddPlaylistSeries").button();
		
		jQuery.ajax({ //gets series and puts them as a collapsible in DOM
			async: false,
			headers: { 
				'Accept': 'application/json',
				'Content-Type': 'application/json' 
			},
			type: "POST",
			'url': '/jsonrpc?getTVShows',
			'data': '{"jsonrpc": "2.0", "method": "VideoLibrary.GetTVShows", "params": { "properties": ["art", "title",  "thumbnail"], "sort": { "method": "sorttitle", "ignorearticle": true }}, "id": 1}',
			'dataType': 'json',
			'success': function(resultGetTVShows){
						//check if there is anything in the lib. eigther show info or hide loading bar
						if(resultGetTVShows["result"]["limits"]["total"] == 0){
							$("#series_list").append("<li><h3>" + yTools.ts("LIB_EMPTY") + "</h3></li>").trigger( "create" );
							$(".loading").hide();
						} else {
							
							var seriesThumbAddon = "";
							
							for (var i = 0; i < resultGetTVShows["result"]["limits"]["end"]; i++) {
								var TVShowID = resultGetTVShows["result"]["tvshows"][i]["tvshowid"];
								var TVShowName = resultGetTVShows["result"]["tvshows"][i]["title"];
								if(!yS.yS.hidePrevPics){
									seriesThumbAddon ="<img class='seriesThumbAddon' alt='" + TVShowName 
													+ "' src='" + yTools.imageUrlNormalizer(resultGetTVShows["result"]["tvshows"][i]["art"]["banner"], "?")
													+ "'/>";
								} else {
									seriesThumbAddon = TVShowName;
								}
								
								$("#series_list").append(
									"<li>"
										+ "<div data-role='collapsible' class='openSeries' data-yTVShowID='" + TVShowID + "'>"
											+ "<h3>"
												+ seriesThumbAddon
											+ "</h3>"
                                            + "<div id='"	+ TVShowID	+ "'></div>"
										+ "</div>"
									+ "</li>"
								).trigger( "create" );
							}
							$("#loading_series").hide();
						}
					}   
			});
		}
		
		$("body").delegate(".showEpidodeDetails", "click", function(e){ //opens and fills popup with episode details
			e.stopImmediatePropagation();	
			ySeries.showEpidodeDetails($(this).attr('data-yEpisodeID'));				
		});
		
		$('#detailspopupSeries').bind({ //removes imgae of episode details popup
			popupafterclose: function(event, ui) {
					$("#popupImageSeries").attr("src","resources/images/transparent.gif");
			}
		});
		
		$("#detailspopupSeriesClose").click(function(e) {
            e.stopImmediatePropagation();
            $('#detailspopupSeries').popup("close");
		});
        
        $("body").delegate(".addSeriesSeason", "click", function(e){
            e.stopImmediatePropagation();
            $(this).button('disable');
            
            //select season collapsible and search for all links (episodes), then sort them after episode number
            var unsortedArray = $("#" + $(this).attr('data-yShowID') + "-" + $(this).attr('data-yShowSeasonID')).children("a").sort(function (a, b) {
                var contentA = parseInt( $(a).attr('data-yepisodenumber'));
                var contentB = parseInt( $(b).attr('data-yepisodenumber'));
                return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
            })
           
            // send each episode of the sorted list to the playlist
            unsortedArray.each(function() {
                ySeries.addEpisodeToPlaylist($(this).attr('data-yepisodeid'));
            });
        });
		
		$("body").delegate("#popupPlaySeries", "click", function(e){ // starts episode 
			e.stopImmediatePropagation();
			ySeries.popupPlaySeries($(this).attr('data-yPlaySeriesPath'));
		});
		
		$("body").delegate("#popupAddPlaylistSeries", "click", function(e){ // starts episode 
			e.stopImmediatePropagation();
			ySeries.addEpisodeToPlaylist($(this).attr('data-yEpisodeID'));
            $("#popupAddPlaylistSeries").button('disable'); //init of button and get rid of div around (created by buton() )
		});
        
        $(".openSeries").collapsible({
          expand: function(e){ //gets seasons of series and puts them in a list and add's it to DOM
                      e.stopImmediatePropagation();
                      ySeries.openSeries($(this).attr('data-yTVShowID'));
                  },
          collapse: function(e){ //removes episodes from DOM if series is closed
                        var node = document.getElementById($(this).attr('data-yTVShowID'));
                        if ( node.hasChildNodes() ){
                            while ( node.childNodes.length >= 1 ){
                                node.removeChild( node.firstChild );       
                            } 
                        }

                    }
        });
	},
	/*
	 * called if a Series (or TV-show) is opened
	 */
	openSeries: function(TvShowId){
		var TVShowSeasonID = ""; 
        
		yCore.sendJsonRPC(
			'GetSeasons',
			'{"jsonrpc": "2.0", "method": "VideoLibrary.GetSeasons", "params": {"properties": ["season", "showtitle", "fanart","playcount"], "tvshowid":' 
									+ TvShowId + '}, "id": 1}',
			function(resultGetSeasons){
				for (var j = 0; j < resultGetSeasons["result"]["limits"]["end"]; j++) {
					var TVShowSeasonID = resultGetSeasons["result"]["seasons"][j]["season"]; // that right season is in right collapsible
					
					var seasonSeen = "";
					if(resultGetSeasons["result"]["seasons"][j]["playcount"] > 0){
                        if(yS.yS.hideWatched){continue;}//if setting says to not show seen episodes, go to next iteration
                        seasonSeen = "<img class='greenSeriesSeason' alt='season is seen' src='resources/images/green_tick.png' />";
                    }
					
					$("#"+TvShowId).append(
						"<div data-role='collapsible' class='openSeason' data-yTVShowSeasonID='" + TVShowSeasonID + "'>"
							+ "<h3>" + resultGetSeasons["result"]["seasons"][j]["label"] + seasonSeen + "</h3>"
							+ "<div id='"+TvShowId+"-"+TVShowSeasonID+"'></div>"
						+ "</div>"
					).trigger( "create" );
					
					yCore.sendJsonRPC(
						'GetEpisodes',
						'{"jsonrpc": "2.0", "method": "VideoLibrary.GetEpisodes", "params": { "properties": ["season","episode", "showtitle", "plot", "thumbnail", "file", "rating", "playcount", "streamdetails"],"tvshowid":' + TvShowId + ',"season" : ' + TVShowSeasonID + ' }, "sort": { "order": "ascending", "method": "episode"}, "id": 1}',
						function(resultGetEpisodes){
                            //Add a button to add whole season to the playlist
                            $("#"+TvShowId+"-"+TVShowSeasonID).append(
                                "<div class='addSeriesSeason' "
                                    + "data-yShowID='"+TvShowId+"' "
                                    + "data-yShowSeasonID='"+TVShowSeasonID+"' >" + yTools.ts("ADD_SEASON")
                              + "</div>"
							);                            
                            $(".addSeriesSeason").button(); 
                            
							for (var k = 0; k < resultGetEpisodes["result"]["limits"]["end"]; k++) {
                                
                                var seen = "";
								if(resultGetEpisodes["result"]["episodes"][k]["playcount"]>0){
                                    if(yS.yS.hideWatched){continue;}//if setting says to not show seen episodes, go to next iteration
									seen = "<img class='greenSeries' alt='episode is seen' src='resources/images/green_tick.png' />";
        
                                    if(yS.yS.hidePrevPics){ $(".greenSeries").css("margin-left", "0px");}
								}
								
								var imageTag = "";
								if(!yS.yS.hidePrevPics){
                                    imageTag = "<img class='seriesPrevPic' alt='' src='" 
                                          + yTools.imageUrlNormalizer(resultGetEpisodes["result"]["episodes"][k]["thumbnail"], "?") 
                                          + "' />";
                                } else {imageTag = "";}
								
								$("#"+TvShowId+"-"+TVShowSeasonID).append(
								"<a class='showEpidodeDetails' data-yEpisodeID='"+ resultGetEpisodes["result"]["episodes"][k]["episodeid"] 
                                    + "' data-yEpisodeNumber='"+ resultGetEpisodes["result"]["episodes"][k]["episode"]
								+ "'>"
									+ "<li class='series-item yListItem'> "                                    
                                        + imageTag
										+ seen 
										+ "<h4>" + resultGetEpisodes["result"]["episodes"][k]["label"] + "</h4>"
									+ "</li>"
								+ "</a>"
								);
							}
							//removes season collapsible, if empty
							if (!$("#"+TvShowId+"-"+TVShowSeasonID + " li"  ).children().length){
									$("#"+TvShowId+"-"+TVShowSeasonID).parent().parent().remove(); //[check: better selector
									$("#"+TvShowId).append("<div>Season "+TVShowSeasonID +": "+ yTools.ts("NO_MATCH")+"</div>").trigger( "create" );
							}
						},
						false
					);
				}
			}
		);
	},
	/*
	 * called if a Episode is opened
	 */
	showEpidodeDetails: function(episodeID){
        $("#popupAddPlaylistSeries").button('enable');
		yCore.sendJsonRPC(
			'GetEpisodeDetails',
			'{"jsonrpc": "2.0", "method": "VideoLibrary.GetEpisodeDetails", "params": { "properties": ["season","episode", "showtitle", "plot", "fanart", "thumbnail", "file", "rating", "playcount", "streamdetails"],"episodeid":' + episodeID + '}, "id": 1}',
			function(resultGetEpisodeDetails){
				
				ySeries.episodeDetails = resultGetEpisodeDetails["result"]["episodedetails"];
				
				if(!yS.yS.hidePrevPics){
					$("#popupImageSeries").attr(
						"src",yTools.imageUrlNormalizer(ySeries.episodeDetails["thumbnail"], "?")
					);
				}
				
				if(!yS.yS.hideLanguageMovies){
					//add flag and "language-native" to streamdetails of the yarc internal movies-array
					for (var j=0;  j < ySeries.episodeDetails["streamdetails"]["audio"].length; j++){//run whole kodi-language list
						if(ySeries.episodeDetails["streamdetails"]["audio"][j]["language"] in langCodeToDescFlag){//if code is in json
							var lang = ySeries.episodeDetails["streamdetails"]["audio"][j]["language"]
							ySeries.episodeDetails["streamdetails"]["audio"][j]["native"] = langCodeToDescFlag[lang]["native"];
							ySeries.episodeDetails["streamdetails"]["audio"][j]["flag"] = langCodeToDescFlag[lang]["flag"];
							ySeries.episodeDetails["streamdetails"]["audio"][j]["isocode"] = lang;						
						}
					}
					
					/*
					*  secondly, it searches for isocodes in the filename which has to be in brackets [], if there is found something, it also 
					*  addes the additional data into the streamdetails-audio (yarc internal only)
					*/
					if(ySeries.episodeDetails["file"].indexOf("[") >= 0){//if there is no starting bracket in filepath, don't even try
						for (var code in langCodeToDescFlag) { //go trough every isocode in the list
							if (langCodeToDescFlag.hasOwnProperty(code)) {
								if (ySeries.episodeDetails["file"].toLowerCase().indexOf("["+code+"]") >= 0) {//if code is found in filename	
									var codeIsSet = false;
									//go trough whole streamdetails-audio list
									for (var j=0;  j < ySeries.episodeDetails["streamdetails"]["audio"].length; j++){
										//if code is already in streamdetails-audio...
										if(code == ySeries.episodeDetails["streamdetails"]["audio"][j]["isocode"]){
											codeIsSet = true;//... remeber it to...
										}
									}
									if(!codeIsSet){//..not add it again to aopton list
										var streamdet = {native:langCodeToDescFlag[code].native, flag:langCodeToDescFlag[code].flag, isocode:code};//prepare object to be pushed into streamdetails-audio
										ySeries.episodeDetails["streamdetails"]["audio"].push(streamdet);//push object above
									}
								}
							}
						}
					}
				}
				
				
				$("#popupTitleSeries").text(ySeries.episodeDetails["showtitle"] + " - " + ySeries.episodeDetails["label"]+" - Season "+ ySeries.episodeDetails["season"] + " Episode " + ySeries.episodeDetails["episode"]);	
				document.getElementById('popupRatingSeries').innerHTML = (yTools.ts("RATING")+ ": "  +  yTools.ratingToStars(ySeries.episodeDetails["rating"]));
				$("div#popupPlotSeries").text(ySeries.episodeDetails["plot"]);
				if(!yS.yS.hideLanguageMovies){
					document.getElementById('popupLanguagesFlagsSeries').innerHTML = yTools.pathToFlags(ySeries.episodeDetails["streamdetails"]["audio"]);
				}
				$("#popupPlaySeries").attr("data-yPlaySeriesPath", ySeries.episodeDetails["file"]);
                $("#popupAddPlaylistSeries").attr("data-yEpisodeID", ySeries.episodeDetails["episodeid"]);
				$('#detailspopupSeries').popup('open');
			}
		);
		
		$('#detailspopupSeries').popup('open');
	},	
	/*
	 * called to play an episode
	 */
	popupPlaySeries: function(pathToFile){
		$('#popupPlaySeries').text(yTools.ts("LOADING")).button("refresh"); // change button text because of long JSON Call time			
		yCore.sendJsonRPC(
			'PlayerOpen',
			'{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "file":  "' + pathToFile + '" } }, "id": 1 }',
			function(){ 
				window.location.href = "#remote";
				$('#popupPlaySeries').text(yTools.ts("PLAY")).button("refresh");
			}
		);
	},	
	/*
	 * called to add episode to playlist
	 */
	addEpisodeToPlaylist: function(episodeid){
		yCore.sendJsonRPC(
			'PlaylistAdd',
			'{ "jsonrpc": "2.0", "method": "Playlist.Add", "params": { "playlistid" : 1 ,  "item": { "episodeid":  ' + episodeid + ' } }, "id": 1 }',
			''
		);
	}
	
}

/*
 * All functions to get music infos and the functions of the music page
 */
var yMusic = {
	albumJSON:[],
	genres: [],
	already_run:false,
	listPos: 0,
	listLength: 0,
	artistString: "",
	lastListItem: 0,
	firstListItem: [0], //keep track of trail when mooving forward in restricted list
	init: function() {
		
		if(yS.yS.hideSearchMusic){$("#searchMusic").parent().hide();} //hide Search field if set in settings
		if(yS.yS.hideGenreMusic){$("#genreSelectMusic").parent().hide();} //hide  genre selection  field if set in settings
		
		if (!yMusic.already_run){
			yMusic.already_run = true; 
			yCore.sendJsonRPC(
				'GetAlbums',
				'{"jsonrpc": "2.0", "method": "AudioLibrary.GetAlbums", "params": {"properties": ["title", "thumbnail", "artist", "genre"], "sort": { "order": "ascending", "method": "artist", "ignorearticle": true } }, "id": 1}',
				function(resultGetAlbums){
										
					yMusic.albumJSON = resultGetAlbums; //write result in Array for further use 
					yMusic.createAlbumList(0, yS.yS.musicPageSettings.genreselect, ""); 

					$('#genreSelectMusic').change(function() {  //create Action Listener for list with selection choice
                      
                        //save change in settings
                        yS.yS.musicPageSettings.genreselect = $(this).val();
                        yS.saveSettingsToLocalStorage();
                      
						$('#album_list').empty(); //empty ul to update list with new choices
                        $("#album-flex-prev").empty();
                        $("#album-flex-next").empty();
						
						yMusic.firstListItem = [0];  //if selection changed, start from the beginning
						yMusic.createAlbumList(0, $('#genreSelectMusic').val(), $("#searchMusic").val()); //create albumlist according to options
                        
                        
					});
				}
			);
		}
		
		$("body").delegate(".showAlbum", "click", function(e){
			e.stopImmediatePropagation();	
			yMusic.showAlbum($(this).attr('data-yAlbumArrayID')); //give in first attr Kodi-album-id and in the second internal reference		
		});
		
		$("#searchMusic").keyup(function() {
			$('#album_list').empty(); //empty ul to update list with new choices
			$("#album-flex-prev").empty();
			$("#album-flex-next").empty();
			yMusic.firstListItem = [0];//if selection changed, start from the beginning
			yMusic.createAlbumList(0, $('#genreSelectMusic').val(), $("#searchMusic").val());
		});
		
		$("body").delegate("#playPlaylist", "click", function(e){  
			yMusic.playPlaylist();
		});
		
		$("body").delegate("#emptyPlaylist", "click", function(e){  
			yMusic.emptyPlaylist();
		});		
		
		$("#detailspopupMusicClose").click(function(e) {
			e.stopImmediatePropagation();
			$('#detailspopupMusic').popup("close");
		});			
		
		$("body").delegate("#popupAddAlbum", "click", function(e){
			e.stopImmediatePropagation();	
			yMusic.popupAddAlbum($(this).attr('data-yAlbumArrayNr'));		
		});
		
		$("body").delegate(".playSong", "click", function(e){
			e.stopImmediatePropagation();
			if($("input[name='popupMusicAddPL']:checked").val() == "1"){
					$(this).fadeTo(500, 0.2); //grey out if added to playlist
			}
			//if it is double pressed, it does not get selected twice
			if($(this).css("opacity") != 0.2){
              yMusic.playSong($(this).attr('data-ySongId'));
            }
		});
		
		$("body").delegate("#albumListPrev", "click", function(e){  //checkbox select/unselect reverser
			e.stopImmediatePropagation();
			yMusic.listPos = yMusic.firstListItem.pop();//if one back, remove item from trail-array
			$('#album_list').empty();
			$("#album-flex-prev").empty();
			$("#album-flex-next").empty();
			yMusic.createAlbumList(yMusic.listPos, $('#genreSelectMusic').val(), $("#searchMusic").val());
            
            //scroll to top
            $('html,body').animate({scrollTop: $("#music").offset().top},'fast');
		});

		$("body").delegate("#albumListNext", "click", function(e){  //checkbox select/unselect reverser
			e.stopImmediatePropagation();
			yMusic.listPos = yMusic.lastListItem + 1;//befor creating new list remeber the position where to start
						
            yMusic.firstListItem.push(parseInt($( "#album_list" ).children().eq(0).attr('data-yAlbumArrayID')));
			
			$('#album_list').empty();
			$("#album-flex-prev").empty();
			$("#album-flex-next").empty();
			yMusic.createAlbumList(yMusic.listPos, $('#genreSelectMusic').val(), $("#searchMusic").val());
            
            //scroll to top
            $('html,body').animate({scrollTop: $("#music").offset().top},'fast');
		});
	},
	/*
	 * create the music list according to the selections (genre and searchfield)
	 */
	createAlbumList: function (listStart, genre, searchval) {
		var selectedGenre = genre;
		var albumGenreInItem;
		var tempGenreLenth = yMusic.genres.length; //save length to check later if it is the first time to be updated
		itemsInList = 0; //needed to find out, how many items are shown, so that if list is restricted we know if next button has to be shown
		
		if(yMusic.albumJSON["result"]["limits"]["total"] == 0){
			$("#album_list").append("<li><h3>" + yTools.ts("LIB_EMPTY") + "</h3></li>").trigger( "create" );
			$("#loading_music").hide();
		} else {
	
			yMusic.listPos = listStart; //needed, that in initalaition by restriction, list starts at 0, but not if next or prev button
			
			if(yS.yS.listLength > yMusic.albumJSON["result"]["limits"]["end"]){
				yMusic.listLength = yMusic.albumJSON["result"]["limits"]["end"];
			} else{
				yMusic.listLength = yS.yS.listLength;
			}
			
			if(yMusic.listPos > 1){//only add back button if it is not the first page	
				$("#album-flex-prev").append(
					"<a id='albumListPrev' data-yAlbumArrayID='albumListPrev' class='flexListPrevNext'>"
                      +" <div class='' data-yAlbumArrayID='albumListPrev'>" 
                        + "<img class='musicPrevPicArrow' alt='Previous items' src='resources/images/listprev.png' />" 
                        + "<h4>" + yTools.ts("BACK") +"</h4>"
                      + "</div>"
					+"</a>" 
				);
                $("#album-flex-prev").show();
            }else {$("#album-flex-prev").hide(); }
			for (var i = 0; i < (yMusic.albumJSON["result"]["limits"]["end"]); i++) { //all albums
				for (var j=0; j < yMusic.albumJSON["result"]["albums"][i]["genre"].length; j++){ //all genres in movie
					if (!(jQuery.inArray(yMusic.albumJSON["result"]["albums"][i]["genre"][j], yMusic.genres) > -1)){ //push if already not therel
						yMusic.genres.push(yMusic.albumJSON["result"]["albums"][i]["genre"][j]);	
					} 
					if (selectedGenre == yMusic.albumJSON["result"]["albums"][i]["genre"][j]){
						albumGenreInItem = 1;	//remember it, if album has the selected genre
					}
				}
				//show only elements with the given genre
				if(selectedGenre == "all" || albumGenreInItem == 1){
					// show only titles and artists (so far only first in artistsarray) matched to searchstring, also partly
					if(searchval === undefined || yMusic.albumJSON["result"]["albums"][i]["title"].toLowerCase().indexOf(searchval.toLowerCase()) != -1 || yMusic.albumJSON["result"]["albums"][i]["artist"]["0"].toLowerCase().indexOf(searchval.toLowerCase()) != -1){

						//skip what should not be seen
						if(i >= yMusic.listPos && itemsInList < yMusic.listLength){
                          
                          $("#album_list").append(
                              "<a class='showAlbum' data-yAlbumArrayID='" + i + "'>"
                                +" <div class='' data-yAlbumArrayID='" + i + "'>" 
                                    + "<img class='musicPrevPic' alt='' src='" 
                                        + yTools.imageUrlNormalizer(yMusic.albumJSON["result"]["albums"][i]["thumbnail"], "?") 
                                    +"' />" 
                                    + "<div><h4>" + yMusic.albumJSON["result"]["albums"][i]["title"] + "</h4>"
                                    +" <p class='musicListArtist'>" +  yTools.artistsToString(yMusic.albumJSON["result"]["albums"][i]["artist"]) + "</p></div>"
                                + "</div>"
                              +"</a>" 
                          );
                          itemsInList++; 
                          yMusic.lastListItem = i; //remember last item of the list
						}
					}
				}
				albumGenreInItem = 0;
				if(yS.yS.hidePrevPics){$(".musicPrevPic").remove();} //hide previmage if set in settings
			}
			
			//only show if not at the end of the list, and no more items in the list to show
			
			if(!($(".showAlbum").length < yS.yS.listLength)){
				$("#album-flex-next").append(
					"<a id='albumListNext' data-yAlbumArrayID='albumListNext' class='flexListPrevNext'>"
						+" <div>" 
							+ "<img class='musicPrevPicArrow' alt='Next items' src='resources/images/listnext.png' />"  
							+ "<h4>" + yTools.ts("NEXT") +"</h4>"
						+ "</div>"
					+"</a>" 
				);
                $("#album-flex-next").show();
            }else {$("#album-flex-next").hide(); }
			
			if ( !$("#album_list").children().length ){ //if there are no children, say so
				$("#album_list").append(yTools.ts("NO_MATCH"));
			}

			$("#loading_music").hide();
			if(tempGenreLenth <= 0){ //only populate if it is the first time
				yMusic.genres.sort()
				for (var i=0; i < yMusic.genres.length; i++){  //add genre Options to selection
					$('#genreSelectMusic').append("<option value='" + yMusic.genres[i] + "'>" + yMusic.genres[i] + "</option>");
				}
			}
		}
            
        //set the selectbox according to setting
        $("#genreSelectMusic").val(yS.yS.musicPageSettings.genreselect);
        $('#genreSelectMusic').selectmenu('refresh');
	},
	/*
	 * runs if an album is opened
	 */
	showAlbum: function (albumArrayNr) {	
		$("#popupContainerMusic").empty();
		yCore.sendJsonRPC(
			'GetSongs',
			'{"jsonrpc": "2.0", "method": "AudioLibrary.GetSongs", "params": { "properties": ["title", "artist", "genre", "track", "duration", "album", "thumbnail"], 				"filter": { "albumid" : ' + yMusic.albumJSON["result"]["albums"][albumArrayNr]["albumid"] + '} }, "id": 1}',
			function(resultGetSongsAlbum){
				$("#popupAddAlbum").attr("data-yAlbumArrayNr",albumArrayNr);
				
                $("#popupTitleMusic").text( yTools.artistsToString(yMusic.albumJSON["result"]["albums"][albumArrayNr]["artist"]) + ": " 
						+ yMusic.albumJSON["result"]["albums"][albumArrayNr]["label"]);
				
				if(yMusic.albumJSON["result"]["albums"][albumArrayNr]['thumbnail'] == "" || yS.yS.hidePrevPics){
					$("#popupImageMusic").hide();
				} else {
                    $("#popupImageMusic").attr("src", yTools.imageUrlNormalizer(yMusic.albumJSON["result"]["albums"][albumArrayNr]['thumbnail'], "?"));
					$("#popupImageMusic").show();
				}
				for (var i = 0; i < resultGetSongsAlbum["result"]["limits"]["end"]; i++) {
					var trackNumber = "";
					if(resultGetSongsAlbum['result']['songs'][i]['track'] != "0"){
							trackNumber = resultGetSongsAlbum['result']['songs'][i]['track'] + ") ";
					}
					$("#popupContainerMusic").append(
						"<li class='playSong yListItem' data-ySongId='" + resultGetSongsAlbum['result']['songs'][i]['songid'] + "' tabindex='1'> "
							+ trackNumber 
							+ resultGetSongsAlbum['result']['songs'][i]['title']
							+ " ("+ Math.floor(resultGetSongsAlbum['result']['songs'][i]['duration']/60)+ ":" 
							+ yTools.addZeroTwoDigits(resultGetSongsAlbum['result']['songs'][i]['duration'] % 60)
							+ ")"
						+ "</li>"
					);
				}
			}
		);
		$('#detailspopupMusic').popup('open');		
	},
	playPlaylist: function () {
		$('#playPlaylist').text(yTools.ts("LOADING")).button("refresh");
		setTimeout(function(){$('#playPlaylist').text(yTools.ts("PLAY_PL")).button("refresh");}, 1500);
		yCore.sendJsonRPC(
			'PlayerOpen',
			'{ "jsonrpc": "2.0", "method": "Player.Open", "params": {"item":{"playlistid":0},"options":{"repeat":"off"}}, "id": 1 }',
			function(){ window.location.href = "#remote";}
		);
	},
	emptyPlaylist: function () {
		$('#emptyPlaylist').text(yTools.ts("DONE")).button("refresh");         
		setTimeout(function(){$('#emptyPlaylist').text(yTools.ts("EMPTY_PL")).button("refresh");}, 1500); //change text back in 1.5 seconds
		yCore.sendJsonRPC(
			'PlaylistClear',
			'{"jsonrpc": "2.0", "id": 0, "method": "Playlist.Clear", "params": {"playlistid": 0}}',
			''
		);
	},
	/*
	 * Empty Playlist, Add whole Album and Play
	 */
	popupAddAlbum: function (albumJsonNr) {
		yCore.sendJsonRPC(
			'PlaylistClear',
			'{"jsonrpc": "2.0", "id": 0, "method": "Playlist.Clear", "params": {"playlistid": 0}}',
			''
		);
		yCore.sendJsonRPC(
			'PlaylistAdd',
			'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": { "playlistid" : 0 , "item" : {"albumid" : ' + yMusic.albumJSON["result"]["albums"][albumJsonNr]["albumid"] + '} }, "id": 1}',
			
			function(){
				yCore.sendJsonRPC(
					'PlayerOpen',
					'{ "jsonrpc": "2.0", "method": "Player.Open", "params": {"item":{"playlistid":0},"options":{"repeat":"off"}}, "id": 1 }',
					function(){ window.location.href = "#remote";}
				)
			}
		);
	},
	/*
	 * Play a song clicked in Playlist, and if "Add to playlist" active, it just adds it to playlist
	 */
	playSong: function (songid) {			
		if($("input[name='popupMusicAddPL']:checked").val() == "1"){//if add to pl set
			yCore.sendJsonRPC(
				'PlaylistAdd',
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": { "playlistid" : 0 , "item" : {"songid" : ' + songid + '} }, "id": 1}',
				''
			);
		} else {//else play directly
			yCore.sendJsonRPC(
				'PlaylistAdd',
				'{"jsonrpc": "2.0", "method": "Player.Open", "params": { "item" : {"songid" : ' + songid + '} }, "id": 1}',
				''
			);
		}
	}
}
/*
 * All functions to search for a specific page
 */
var ySongSearch = {
	songs: "",
	init: function() {
		yCore.sendJsonRPC(
			'GetSongs',
			'{"jsonrpc": "2.0", "method": "AudioLibrary.GetSongs", "params": { "properties": [ "album", "thumbnail", "artist"], "sort": { "order": "ascending", "ignorearticle": true } }, "id": "libSongs"}',
			function(resultGetSongs){								
				ySongSearch.songs = resultGetSongs;
				$("#loading_songsearch").hide();
			}
		);
		
		$("body").delegate("#music-search", "click", function(e){
			e.stopImmediatePropagation();
			$('#songsearch-list').empty();
			ySongSearch.searchPrintSong($("#songsearch-searchfield").val());
		});
		
		$("body").delegate(".songlistItem", "click", function(e){
			e.stopImmediatePropagation();
			yCore.sendJsonRPC(
				'PlayerOpen',
				'{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "songid": '
					+ $(this).attr('data-ySongId') + ' } }, "id": 1 }',
					''
			);
		});
		
		$("body").delegate(".songSearchAddPl", "click", function(e){
			e.stopImmediatePropagation();
			$(this).button().unwrap().button('disable');
			yCore.sendJsonRPC(
				'PlaylistAdd',
				'{"jsonrpc": "2.0", "method": "Playlist.Add", "params": { "playlistid" : 0 , "item" : {"songid" : ' + $(this).attr('data-ySongId') + '} }, "id": 1}',
				''
			);
	});
		
		$("body").delegate("#music-songsearchBack", "click", function(e){
			window.location.href = "#music";
		});
	},
	searchPrintSong: function (searchString) {
		var rangeReg = /.{3}(.+ ?)*/;//at least 3 characters
		if (!rangeReg.test($('[name=songsearch-searchfield]').val())) {
			alert(yTools.ts("ALERT_SONGSEARCH"));
			return false;
		}
				
		for (var i = 0; i < (ySongSearch.songs["result"]["limits"]["end"]); i++) {        
          
            var imagetag = "";// prepare image in advance. if there is no image in DB replace with a placeholder image
            if(ySongSearch.songs["result"]["songs"][i]["thumbnail"] == ""){
                imagetag = "<img class='simpleListPrevPic' alt='' src='resources/images/nofile.png' />";
            } else if (!yS.yS.hidePrevPics){
                imagetag = "<img class='simpleListPrevPic' alt='' src='" 
                    + yTools.imageUrlNormalizer(ySongSearch.songs["result"]["songs"][i]["thumbnail"], "?") 
                + "' />";
            }
            
			if(ySongSearch.songs["result"]["songs"][i]["label"].toLowerCase().indexOf(searchString.toLowerCase()) != -1){
				$("#songsearch-list").append(
					"<li class='simpleList yListItem' data-ySongId='" + ySongSearch.songs["result"]["songs"][i]["songid"] + "'>"
                      + imagetag
                      + "<span class='bold'>" + ySongSearch.songs["result"]["songs"][i]["label"] + "</span>"
                      + "<span class='italic'>("+ yTools.artistsToString(ySongSearch.songs["result"]["songs"][i]["artist"]) 
                        + ": " + ySongSearch.songs["result"]["songs"][i]["album"]  + ")"
                      + "</span>"
                      + "<span class='buttonRight'>"
                        + "<button class='songSearchAddPl' data-ySongId='" + ySongSearch.songs["result"]["songs"][i]["songid"] 
                          + "' data-inline='true' data-theme='b' data-mini='true'>" + yTools.ts("ADD_PLAYLIST") 
                        + "</button>"
                      + "</span>"
                    + "</li>"
				).trigger( "create" );
			}
		}
		if ($('#songsearch-list li').length == 0){//if there are no results found, say so
			$('#songsearch-list').append(
              "<li>" + yTools.ts("NO_MATCH") + "</li>"
			);
		}
		return false;
	}
}
/*
 * All functions to get addons and the functions of the addon page
 */
var yAddons = {
	addonBackPath: [["Addons Home",""]],
	addonJSON: [],
	listPos: 0,
	listLength: 0,
	already_run: false,
	init: function() {
      
	
		if(yS.yS.hideSearchAddons){$("#searchAddon").parent().hide();} //hide Search field if set in settings
		if(yS.yS.hideGenreAddons){$("#addonSelect").parent().hide();} //hide  genre selection  field if set in settings
		
		if (!yAddons.already_run){  //that it doesn't run twice
			yAddons.already_run = true;
            $("#detailspopupAddons").hide();
                        
			yCore.sendJsonRPC(
				'GetAddons',
				'{"jsonrpc": "2.0", "method": "Addons.GetAddons", "params": { "enabled": true, "type" : "xbmc.python.pluginsource", "properties": ["name", "thumbnail", "fanart"]}, "id": 1}',
				function(resultGetAddons){
					yAddons.addonJSON = resultGetAddons;
                    
                    //inject an item for Kodi favorites in the addon list and update limits in json
                    yAddons.addonJSON.result.addons.push({addonid:"plugin.kodi.kodi_fav",name: yTools.ts("KODI_FAVS"),thumbnail:"resources/images/star_grey.png"});                    
                    yAddons.addonJSON["result"]["limits"]["end"] += 1;
                    yAddons.addonJSON["result"]["limits"]["total"] += 1;
                    
                    //check if there are settings for each plugin. if not, create them and save it to local storage        
                    for (var i = 0; i < (yAddons.addonJSON["result"]["limits"]["end"]); i++) {
                        if (!(yS.yS.addons.hasOwnProperty(yAddons.addonJSON["result"]["addons"][i]["addonid"]))) {
                            yS.yS.addons[yAddons.addonJSON["result"]["addons"][i]["addonid"]] = {opens: 1,stayInAddonPopup:false,addonpopshowplot:false};
 						}
					}
                    yS.saveSettingsToLocalStorage();
                    
					$("#loading_addon").hide();
					
					yAddons.createAddonList(0, yS.yS.addonPageSettings.addonselect, "");
				}
			);
			
		}
		$("body").delegate(".addonlist-item", "click", function(e){  //executes addon
			e.stopImmediatePropagation();
            
            $("#addonoverview").hide();
            $("#detailspopupAddons").show();
            
            //if the addon is my own injected one, get Kodi Favorites
            if($(this).attr('data-yAddonID') == "plugin.kodi.kodi_fav") { 
				$("#addonspopupList").empty();
				$("#popupImageAddons").attr("src","");
                yAddons.openKodiFavs($(this).attr('data-yAddonID'), $(this).attr('data-yAddonFanartPath'));
            } else {
                $("#addonspopupList").empty();
                $("#popupImageAddons").attr("src","");
                yAddons.populateAddon("plugin://" +$(this).attr('data-yAddonID'), $(this).attr('data-yAddonFanartPath'));
            }
            
            window.location.href = "#detailspopupAddons";            
            
            $('#detailspopupAddons').removeClass('ui-state-focus');
            
			//increment addon startcount in settings by 1 and save it to local storage
            yS.yS.addons[$(this).attr('data-yAddonID')]["opens"] += 1;
            yS.saveSettingsToLocalStorage();
		});
        
		$('#addonSelect').change(function() {
                      
            //save change in settings
            yS.yS.addonPageSettings.addonselect = $(this).val();
            yS.saveSettingsToLocalStorage();
            
			$('#addonlist').empty(); //empty ul to update list with new choices
			$("#addon-flex-prev").empty();
			$("#addon-flex-next").empty();
			yAddons.createAddonList(0, $('#addonSelect option:selected').attr('value'), $("#searchAddon").val());
		});
		
		$("#searchAddon").keyup(function() {
			$("#addonlist").empty(); //empty ul to update list with new choices
			$("#addon-flex-prev").empty();
			$("#addon-flex-next").empty();
			yAddons.createAddonList(0, $('#addonSelect option:selected').attr('value'), $("#searchAddon").val());
		});
		
		$("body").delegate("#addonListPrev", "click", function(e){  //checkbox select/unselect reverser
			e.stopImmediatePropagation();
			yAddons.listPos -= yS.yS.listLength;
			$("#addonlist").empty();
			$("#addon-flex-prev").empty();
			$("#addon-flex-next").empty();
			yAddons.createAddonList(yAddons.listPos, $('#addonSelect option:selected').attr('value'), $("#searchAddon").val());
            
            //scroll to top
            $('html,body').animate({scrollTop: $("#addons").offset().top},'fast');
		});

		$("body").delegate("#addonListNext", "click", function(e){  //checkbox select/unselect reverser
			e.stopImmediatePropagation();
			yAddons.listPos += yS.yS.listLength;
			$("#addonlist").empty();
			$("#addon-flex-prev").empty();
			$("#addon-flex-next").empty();
			yAddons.createAddonList(yAddons.listPos, $('#addonSelect option:selected').attr('value'), $("#searchAddon").val());
            
            //scroll to top
            $('html,body').animate({scrollTop: $("#addons").offset().top},'fast');
		});
        $("#addonspopupRefresh").click(function(e) {
			e.stopImmediatePropagation();
			$("#addonspopupList").empty();
			yAddons.populateAddon($(this).attr('data-yAddonDirPath'), $(this).attr('data-yAddonFanartPath'));
            
            //scroll to top of addon
            $('html,body').animate({scrollTop: $("#detailspopupAddons").offset().top},'slow');
		});
        
		$("#addonspopupopenaddon").click(function(e) {
			e.stopImmediatePropagation();
			yAddons.openAddon($(this).attr('data-yAddonDirPath'));
		});
		
 		$("#detailspopupAddonsBack").click(function(e) {
 			e.stopImmediatePropagation();
            yAddons.addonBackPath = [["Addons Home",""]];
            $("#addonoverview").show();
            $("#detailspopupAddons").hide();
 		});
        
		$("#addonpopshowplot").change(function(e) {
			e.stopImmediatePropagation();
			if($(this).is(':checked')){
				$(".addonPlot").show();
			} else {
				$(".addonPlot").hide();
				
			}
			//save the settings
            yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["addonpopshowplot"] = $(this).is(':checked');
            yS.saveSettingsToLocalStorage();
		});
        
		$("#stayInAddonPopup").change(function(e) {
			//save the settings
            yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["stayInAddonPopup"] = $(this).is(':checked');
            yS.saveSettingsToLocalStorage();
		});
		
		$("#SendTextButtonAddon").click(function(e) {
			e.stopImmediatePropagation();
		
            //Hack for youtube search
            if($("#detailspopupAddons").attr('data-yaddonname')  == "plugin.video.youtube"){
                //populate addon with new querry and replace spaces from search string with +
                yAddons.populateAddon("plugin://plugin.video.youtube/kodion/search/query/?q=" + $("#SendTextFieldAddon").val().replace(' ', '+'), "");
                yRemote.sendTextButton($('#SendTextFieldAddon').val());
            } else {
                yRemote.sendTextButton($('#SendTextFieldAddon').val());
            }
		});
		
   		$("body").delegate(".showAddonDirItem", "click", function(e){                
			e.stopImmediatePropagation();
                  
            //if there was no data pushed, go back to addon overview, otherwise stay in popup
            if(yAddons.addonBackPath.length == 2 && $(this).attr('data-yAddonIsBack') == "back"){
                yAddons.addonBackPath = [["Addons Home",""]];
                $("#addonoverview").show();
                $("#detailspopupAddons").hide();
            } else {
                if($(this).attr('data-yAddonFileType') == "file" || $(this).attr('data-yAddonFileType') == "media"){
                
                    yCore.sendJsonRPC(
                        'PlayerOpen',
                        '{ "jsonrpc": "2.0", "method": "Player.Open", "params": { "item": { "file":  "' + $(this).attr('data-yAddonFile') + '" } }, "id": 1 }',
                        ''
                    );   
                    if(!$("#stayInAddonPopup").is(':checked')){
                        window.location.href = "#remote";
                    }
                    
                } else if ($(this).attr('data-yAddonFileType') == "directory" || $(this).attr('data-yAddonFileType') == "window"){
                    $("#addonspopupList").empty();
                    if($(this).attr('data-yaddonfile') == "plugin.kodi.kodi_fav"){
                        yAddons.openKodiFavs($(this).attr('data-yAddonID'), $(this).attr('data-yAddonFanartPath'));
                    } else {
                        if( $(this).attr('data-yAddonIsBack') == "back"){
                            yAddons.addonBackPath.pop();yAddons.addonBackPath.pop();
                          
                        }
                        yAddons.populateAddon($(this).attr('data-yAddonFile'), $(this).attr('data-yAddonFanartPath'));
                    }
                    
                    //scroll to top of addon
                    $('html,body').animate({scrollTop: $("#detailspopupAddons").offset().top},'slow');
                } 
            }
		});
        
        $("body").delegate(".addonDirItemRight", "click", function(e){
			e.stopImmediatePropagation();

            var contextString = "";
            var fileType = "";
            var windowParameter = "";
            
            //if it's a file item, add posibility to add to playlist and remember it as a media item
            if($(this).closest('.showAddonDirItem').attr('data-yAddonFileType') == "file"){
              fileType = "media";
              
              contextString += "<p class='contextMenu addonAddPL' data-yAddonFile='" + $(this).closest('.showAddonDirItem').attr('data-yAddonFile') + "' tabindex='1'>" 
                      + yTools.ts('ADD_PLAYLIST');
            } else { //if it's not a media item, than remember it as a window item
              fileType = "window";
            }
            
            //for all items
            contextString +=
                "<p class='contextMenu addonAddFavorite' "
                  + "data-yAddonLinkName='" + $(this).closest('.showAddonDirItem').find( "h4" ).text() + "' "
                  + "data-yAddonFile='" + $(this).closest('.showAddonDirItem').attr('data-yAddonFile') + "' "
                  + "data-yAddonFanartPath='" + $(this).closest('.showAddonDirItem').attr('data-yAddonFanartPath') + "' "
                  + "data-yAddonLinkType='" + fileType + "' "
                  + "tabindex='1'>" + yTools.ts('ADD_FAVORITE') + "</p>";                        
            
            //if context is not shown, create context menu and set context to shown;
            if($(this).attr('data-yContextShown') == "0"){
                $(this).closest('.showAddonDirItem').after(contextString);
                $(this).attr('data-yContextShown', "1");
            } else { //else remove context menu and set to not shown
                $(this).closest('.showAddonDirItem').nextAll('p').remove();    
                $(this).attr('data-yContextShown', "0");
            }
        }); 
        
        /* delete a favorite, just add an existing favorite (results in deleting it)*/
        $("body").delegate(".addonFavDelete", "click", function(e){
			e.stopImmediatePropagation();
            var choice = confirm(yTools.ts('SURE_TO_DELETE'));

            if (choice) {            
                yCore.addToKodiFavorites(
                    $(this).parent().find("h4").text(),
                    $(this).parent().parent().attr("data-yaddonfiletype"),
                    $(this).parent().parent().attr("data-yaddonfile"),
                    ""
                );
                
                $(this).parent().parent().hide(); //grey out if added to playlist
            }
        });         
        
        $("body").delegate(".addonAddPL", "click", function(e){
          e.stopImmediatePropagation();          
          
          //if it is double pressed, it does not get selected twice
          if($(this).css("opacity") != 0.2){
            yCore.sendJsonRPC(
              'PlaylistAdd',
              '{"jsonrpc": "2.0", "method": "Playlist.Add", "params": { "playlistid" : 1 , "item" : {"file" : "' + $(this).attr('data-yAddonFile') + '"} }, "id": 1}',
              ''
            );            
          }
          $(this).fadeTo(500, 0.2); //grey out if added to playlist
        });
        
        //add to kodi favorites
        $("body").delegate(".addonAddFavorite", "click", function(e){
          e.stopImmediatePropagation();
          
          if($(this).css("opacity") != 0.2){   
             yCore.addToKodiFavorites(
                $(this).attr('data-yAddonLinkName'),
                $(this).attr('data-yAddonLinkType'),
                $(this).attr('data-yAddonFile'),
                $(this).attr('data-yAddonFanartPath')
              );
          }
          $(this).fadeTo(500, 0.2); //grey out if added to playlist
        });
	},
				
	/*
	 * creates addonselection according to type selection and or search string
	 */
	createAddonList: function(listStart, addonTypeSelected, searchval){
				
		var itemsInList = 0; //needed to find out, how many items are shown, so that if list is restricted we know if the next-button has to be shown
		yAddons.listPos = listStart; //needed, that in initalaition by restriction, list starts at 0, but not if next or prev button
		
		if(yAddons.addonJSON["result"]["limits"]["total"] == 0){
			$("#addonlist").append("<li><h3>" + yTools.ts("LIB_EMPTY") + "</h3></li>").trigger( "create" );
			$(".loading").hide();
		} else {
			if(yS.yS.listLength > yAddons.addonJSON["result"]["limits"]["end"]){
				yAddons.listLength = yAddons.addonJSON["result"]["limits"]["end"];
			} else{
				yAddons.listLength = yS.yS.listLength;
			}
			
			if(yAddons.listPos != 0){	 //only add if it's not the first page (value 999999 makes it first item
				$("#addon-flex-prev").append(
					"<li id='addonListPrev' class='flexListPrevNext'> "
						+ "<img class='addonImageArrow' alt='Previous items' src='resources/images/listprev.png' />"
						+ "<h4 class='addontitle'>" + yTools.ts("BACK") +"</h4>"
					+ "</li>"
				);
                $("#addon-flex-prev").show();
            } else {$("#addon-flex-prev").hide(); }
			
			for (var i = 0; i < (yAddons.addonJSON["result"]["limits"]["end"]); i++) {
				var addonIDStringParts = yAddons.addonJSON["result"]["addons"][i]["addonid"].split('.');
				
				var imagetag = "";						
				if(!yS.yS.hidePrevPics){
                    if(yAddons.addonJSON["result"]["addons"][i]["addonid"] != "plugin.kodi.kodi_fav"){
                        imagetag = "<img alt='' class='addonImage' src='"
                                        + yTools.imageUrlNormalizer(yAddons.addonJSON["result"]["addons"][i]["thumbnail"], "?") 
                                    + "' />";
                    } else {
						imagetag = "<img alt='' class='addonImage' src='resources/images/star_grey.png' />";                      
                    }
				}

				if (addonTypeSelected == "all" || addonIDStringParts[1] == addonTypeSelected){ 
					if(searchval === undefined || yAddons.addonJSON["result"]["addons"][i]["name"].toLowerCase().indexOf(searchval.toLowerCase()) != -1){
						$("#addonlist").append(
						"<li class='addonlist-item' data-yAddonID='" + yAddons.addonJSON["result"]["addons"][i]["addonid"] + "' "
							+ "data-yAddonFanartPath='" + yAddons.addonJSON["result"]["addons"][i]["fanart"] + "' "
							+ "value='" + yS.yS.addons[yAddons.addonJSON["result"]["addons"][i]["addonid"]]["opens"] + "'> "
							+ imagetag
							+ "<h4 class='addontitle'>" + yAddons.addonJSON["result"]["addons"][i]["name"] + "</h4>"
						+ "</li>");
						itemsInList++;
					}
                //if plugins are not video or audio (aka "other")
				} else if (addonTypeSelected == "other" && addonIDStringParts[1] != "video" && addonIDStringParts[1] !=  "audio"){
						$("#addonlist").append(
						"<li class='addonlist-item' data-yAddonID='" + yAddons.addonJSON["result"]["addons"][i]["addonid"] + "' "
							+ "data-yAddonFanartPath='" + yAddons.addonJSON["result"]["addons"][i]["fanart"] + "' "
							+ "value='" + yS.yS.addons[yAddons.addonJSON["result"]["addons"][i]["addonid"]]["opens"] + "'> "
							+ imagetag
							+ "<h4 class='addontitle'>" + yAddons.addonJSON["result"]["addons"][i]["name"] + "</h4>"
						+ "</li>");
						itemsInList++;
                  
                }
			}
			
			//sort the addonlist (li... value) by value, descending; there is saved how many times the addon was opened from this addon
			$("#addonlist").html(
              $("#addonlist").children("li").sort(function (a, b) {
                  return $(b).val() - $(a).val();
              })
            );
            
			//only show if not at the end of the list, and no more items in the list to show
			if((yAddons.listPos + yAddons.listLength) < yAddons.addonJSON["result"]["limits"]["end"] && (yAddons.listPos + yAddons.listLength) < itemsInList){		
				$("#addon-flex-next").append(//value 0 makes button the last one in list
					"<li id='addonListNext' class='flexListPrevNext'> "
						+ "<img class='addonImageArrow' alt='Next items'  src='resources/images/listnext.png' />"
						+ "<h4 class='addontitle'>" + yTools.ts("NEXT") +"</h4>"
					+ "</li>"
				);
                $("#addon-flex-next").show();
            } else {$("#addon-flex-next").hide(); }
			
			$(".addonlist-item").hide(); //first hide all to prepare negative of slice
			$(".addonlist-item").slice(yAddons.listPos, (yAddons.listPos+yAddons.listLength)).show();
			
			if ( !$("#addonlist").children().length ){ //if there are no children, say so
				$("#addonlist").append(yTools.ts("NO_MATCH"));
			}
		}	
		
        $("#addonSelect").val( yS.yS.addonPageSettings.addonselect);
        $('#addonSelect').selectmenu('refresh');
	},    
	openAddon: function(addonid){
		yCore.sendJsonRPC(
			'ExecuteAddon',
			'{"jsonrpc": "2.0", "method": "Addons.ExecuteAddon", "params": { "addonid": "' + addonid + '" }, "id": 1}',
			function(){ 
				window.location.href = "#remote";
			}
		);
	},
	populateAddon:  function(addonIDandPath, prevfanartpath){	
		$("#loading_addonPopup").show();        
        $("#addonspopupopenaddon").show();   
        $("#addonspopupRefresh").show();
        
        //addon comes as plugin://bla.bla.ba/blabla¬bla and also cut everything behind ?
		$("#detailspopupAddons").attr('data-yAddonname', addonIDandPath.split('/')[2].split('?')[0]);
						
		//'{"jsonrpc":"2.0","method":"Files.GetDirectory","id":1,"params":["plugin://' + addonIDandPath + '/","video"
		//"title","size","mimetype","file","dateadded","thumbnail","artistid","albumid","uniqueid"],{"method":"title","order":"ascending"}
		var mediatype = "";
		if(addonIDandPath.indexOf('audio') >= 0){mediatype = "music";} 
		else {mediatype = "video";}
				
        $("#addonspopupList").append(
            "<a  id='back' class='showAddonDirItem' "
            + "data-yAddonFile='" + yAddons.addonBackPath[yAddons.addonBackPath.length-1][0] //the path from the previous item
            + "' data-yAddonFileType='directory'"
            + " data-yAddonIsBack='back' data-yAddonFanartPath='" 
            + yAddons.addonBackPath[yAddons.addonBackPath.length-1][1] +"' tabindex='1'>" //fanart from previous item
                +"<li class='addonDirItem yListItem'>"
                    + "<img class='addonDirBackPic' alt='back button' src='resources/images/listprev.png' />"  
                    + "<h4>" + yTools.ts("BACK") + "</h4>"
                +"</li>"
            +"</a>" 
        );
		
		yCore.sendJsonRPC(
            'OpenAddon_' + addonIDandPath,
			'{"jsonrpc":"2.0","method":"Files.GetDirectory","id":1,"params":["' + addonIDandPath + '","' + mediatype + '",["title","file","thumbnail", "playcount","art","plot","runtime", "premiered"]]}',
			function(resultOpenAddon){              
				
				//if there is fanart, show it in the background
				if(prevfanartpath == ""){
					$("#popupImageAddons").hide();
				} else if(!yS.yS.hidePrevPics){
                    $("#popupImageAddons").attr("src",yTools.imageUrlNormalizer(prevfanartpath, resultOpenAddon["result"]["files"][0]["filetype"]));
                    $("#popupImageAddons").show();
				}
				
				//go trough whole returned list
				for (var i = 0; i < resultOpenAddon["result"]["limits"]["end"]; i++) {
					
					//if setting says to not show seen elements, go to next iteration
					if(yS.yS.hideWatched && resultOpenAddon["result"]["files"][i]["playcount"]>0){continue;}
					
                    var imagetag = "";
                    if(!yS.yS.hidePrevPics){                         
                        imagetag += "<img class='addonDirPrevPic' alt='' src='" 
                            + yTools.imageUrlNormalizer(resultOpenAddon["result"]["files"][i]["thumbnail"], resultOpenAddon["result"]["files"][i]["filetype"]) 
                            + "' />";
                    }                        
                    //show green Tick if played before
                    if(resultOpenAddon["result"]["files"][i]["playcount"]>0){
                        //correct margin left if image is not there, so green_tick is not in unvisible area
                        if(yS.yS.hidePrevPics){$(".greenAddons").css('margin-left', '0px');}
                        imagetag += "<img class='greenAddons' alt='' src='resources/images/green_tick.png' />"
                    }
					
					//get rid of the ugly [] brackets with [b] and [color=....] in filenames
					var itemLabel = resultOpenAddon["result"]["files"][i]["label"];
					if(itemLabel.indexOf('[') >= 0){
						var itemLabel = itemLabel.replace(/(\[.*?\])/g, '');
					}
					
					//prepare plot if there is any
					var plot = "";
					if(undefined != resultOpenAddon["result"]["files"][i]["plot"]){
						plot = resultOpenAddon["result"]["files"][i]["plot"];
					}										
					
					
                    var additionalInfo = "";   //if it's a file, runtime is positive and even exists, write the runtime in minutes and seconds                 
//                     var contextMenuForFiles = ""; //add a context Menu button if it's a file
					if(resultOpenAddon["result"]["files"][i]["filetype"] == "file"){
                        var minutes =  "";
                        var seconds = "";
                        if("premiered" in resultOpenAddon["result"]["files"][i] && resultOpenAddon["result"]["files"][i]["premiered"] != ""){
                          additionalInfo += resultOpenAddon["result"]["files"][i]["premiered"];
                        }   
						if(resultOpenAddon["result"]["files"][i]["runtime"] != "0" && ("runtime" in resultOpenAddon["result"]["files"][i])){
                          var minutes = Math.floor(resultOpenAddon["result"]["files"][i]["runtime"] / 60);
                          var seconds = resultOpenAddon["result"]["files"][i]["runtime"] - minutes * 60;
                          
                          if(additionalInfo != ""){additionalInfo += "; "}
                          additionalInfo +=  yTools.ts("RUNTIME") + ": " +yTools.addZeroTwoDigits(minutes) + ":" + yTools.addZeroTwoDigits(seconds);
                        }
                        
                         if(additionalInfo != ""){ additionalInfo = "<div>(" + additionalInfo + ")</div>"}
					}
					
					//check if there is a poster, if not and there is a thumbnail take it, else take one from the previous dialoge
					//this is all to give the infos over, to the next dialoge, it's not used right now, but in the next dialoge if element klicked
					var fanartpath = ""
					if(!yS.yS.hidePrevPics){
						if ("poster" in resultOpenAddon["result"]["files"][i]["art"]){
							fanartpath = resultOpenAddon["result"]["files"][i]["art"]["poster"]
						} else if ("thumbnail" in resultOpenAddon["result"]["files"][i]) {
							fanartpath = resultOpenAddon["result"]["files"][i]["thumbnail"]
						} else {
							fanartpath = prevfanartpath;
						}
					}               
                    
					$("#addonspopupList").append(
						"<a id='" + resultOpenAddon["result"]["files"][i]["label"] + "' class='showAddonDirItem' "
						+ "data-yAddonFile='" + resultOpenAddon["result"]["files"][i]["file"]
						+ "' data-yAddonFileType='" + resultOpenAddon["result"]["files"][i]["filetype"]
						+ "' data-yAddonIsBack='' data-yAddonFanartPath='" + fanartpath 
						+"' tabindex='1'>"
                          +"<div class='addonDirItem yListItem' tabindex='1'>"
                            +"<div class='addonDirItemLeft' tabindex='1'>"
                              + imagetag 
                              + "<h4>" + itemLabel + "</h4>"                                
                              + additionalInfo
                              +" <p class='addonPlot'>" + plot + "</p>"
                            + "</div>"               
                            + "<div class='addonDirItemRight' data-yContextShown='0' tabindex='1'><h4><i class='fa fa-ellipsis-v'></i></h4></div>" 
                          +"</div>"
						+"</a>"
					).trigger( "create" ).trigger('refresh');
				}
				
				//if there are no relevant children (backbutton is not relevant), say so
				if ( $("#addonspopupList").children().length <= 1 ){
					$("#addonspopupList").append(yTools.ts("NO_MATCH"));
				}
				
				$("#addonspopupRefresh").attr('data-yAddonDirPath', addonIDandPath); 
				$("#addonspopupRefresh").attr('data-yAddonFanartPath', prevfanartpath); 
				$("#addonspopupopenaddon").attr('data-yAddonDirPath', addonIDandPath.split('/')[2]); //addon comes as plugin://bla.bla.ba/blabla¬bla
								
				if(yAddons.addonBackPath[yAddons.addonBackPath.length-1] != addonIDandPath){
					yAddons.addonBackPath.push([addonIDandPath , prevfanartpath]); //push addon id and the path and the fanart of the last page, as breadcrumbs to go back
				}
				
                //set the checkboxes according to settings
                $("#stayInAddonPopup").prop('checked', yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["stayInAddonPopup"]).checkboxradio("refresh");        
                $("#addonpopshowplot").prop('checked', yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["addonpopshowplot"]).checkboxradio("refresh");
                
                if(yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["addonpopshowplot"]){
                    $(".addonPlot").show();
                } else {
                    $(".addonPlot").hide();
                    
                }
        
				$("#loading_addonPopup").hide();
                
                
                $('input').each(function(){ $(this).blur(); });                
			}
		);
	},	
    openKodiFavs: function(addonIDandPath, prevfanartpath){
        $("#addonspopupopenaddon").hide();
        $("#addonspopupRefresh").hide();
        
        $("#popupImageAddons").hide();
        
        
              
        $("#addonspopupList").append(
            "<a class='showAddonDirItem' "
            + "data-yAddonFile='" + yAddons.addonBackPath[yAddons.addonBackPath.length-1][0] //the path from the previous item
            + "' data-yAddonFileType='directory'"
            + " data-yAddonIsBack='back' data-yAddonFanartPath='" 
            + yAddons.addonBackPath[yAddons.addonBackPath.length-1][1] + "' tabindex='1'>" //fanart from previous item
                +"<li class='addonDirItem yListItem'>"
                    + "<img class='addonDirBackPic' alt='back button' src='resources/images/listprev.png' />"  
                    + "<h4>" + yTools.ts("BACK") + "</h4>"
                +"</li>"
            +"</a>" 
        );
      
		yCore.sendJsonRPC(
			'Getfavourites',
			'{"jsonrpc": "2.0", "method": "Favourites.GetFavourites", "params": { "properties": ["window","path","thumbnail","windowparameter"] }, "id": 1}',
			function(resultGetKodiFavs){
              
              for (var i = 0; i < resultGetKodiFavs["result"]["limits"]["end"]; i++) {                
                var pathToFileOrPlace = "";
                if(resultGetKodiFavs["result"]["favourites"][i]["type"] == "window"){
                  pathToFileOrPlace = resultGetKodiFavs["result"]["favourites"][i]["windowparameter"];
                } else if(resultGetKodiFavs["result"]["favourites"][i]["type"] == "media") {
                  pathToFileOrPlace = resultGetKodiFavs["result"]["favourites"][i]["path"];
                }
                
                var imagetag = "";
                if(!yS.yS.hidePrevPics){
                    imagetag = "<img class='addonDirPrevPic' alt='' src='" 
                          + yTools.imageUrlNormalizer(resultGetKodiFavs["result"]["favourites"][i]["thumbnail"], resultGetKodiFavs["result"]["favourites"][i]["type"])
                      + "' />";
                }
                
                $("#addonspopupList").append(
                      "<a class='showAddonDirItem' "
                          + "data-yAddonFile='" +  decodeURIComponent(pathToFileOrPlace)
                          + "' data-yAddonFileType='" + resultGetKodiFavs["result"]["favourites"][i]["type"]
                          + "' data-yAddonIsBack='' data-yAddonFanartPath='" 
                          + yTools.imageUrlNormalizer(resultGetKodiFavs["result"]["favourites"][i]["thumbnail"], resultGetKodiFavs["result"]["favourites"][i]["type"]) 
                      + "' tabindex='1'>"
                        +"<div class='addonDirItem yListItem' tabindex='1'>"
                            +"<div class='addonDirItemLeft' tabindex='1'>"
                                + imagetag
                                + "<h4>" + resultGetKodiFavs["result"]["favourites"][i]["title"] + "</h4>" 
                            + "</div>"                 
                            + "<div class='addonFavDelete' data-yContextShown='0' tabindex='1'><h4><i class='fa fa-times'></i></h4></div>" 
                        +"</div>"
                      +"</a>" 
                  );
              }
				
              //if there are no relevant children (backbutton is not relevant), say so
              if ( $("#addonspopupList").children().length <= 1 ){
                  $("#addonspopupList").append(yTools.ts("NO_MATCH"));
              }
              
              yAddons.addonBackPath.push(["plugin.kodi.kodi_fav" , ""]);
              
              $("#detailspopupAddons").attr('data-yAddonname', "plugin.kodi.kodi_fav");
              
              $("#stayInAddonPopup").prop('checked', yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["stayInAddonPopup"]).checkboxradio("refresh");        
              $("#addonpopshowplot").prop('checked', yS.yS.addons[$("#detailspopupAddons").attr('data-yAddonname')]["addonpopshowplot"]).checkboxradio("refresh");
              
              $("#loading_addonPopup").hide();
            }
		);
    }
}

// /*
//  * All functions to get addons and the functions of the addon page
//  */
// var yAddons = {
// 	init: function() {
//     }
// }

/*
 * Tools and functions which are used in differnet modules
 */
var yTools = {
	ratingToStars: function(stars){  //create image tags for rating according to rating (rounded down)
		var htmlString= "";
		if (stars == 0) { return yTools.ts("NO_RATING");}
		
		stars = Math.round(stars * 100 ) / 100;
			
		htmlString += "<span><img class='ratingStars' alt='' src='resources/images/star.png' />"
                          + "<span>" + stars + "</span></span>";
		return htmlString;
	},
	/*
	 * write all artits from array in a string
	 */
	artistsToString: function(usedJSON){
		var artistString = ""; //empty, to remove previous content, to avoid wrong or multiple informations
		for (var j=0; j < usedJSON.length; j++){ //all genres in movie
			artistString += usedJSON[j];
			if (j !=  (usedJSON.length -1)) { artistString += ", "; }
		}
		if (artistString==""){
          return artistString += "unknown";
        } else {return artistString};			
	},
	/*
    * Yarc TraSlate - to translate interface
    */	
	ts: function(transConst){
		try{
			return translations[transConst][yS.yS.language];	
		}
			catch(e){
			alert('ERROR: ' +transConst + ": " + e.message)
		}
		return true;
	},
	addZeroTwoDigits: function(digit) {
		digit = "0" + digit;
		return digit.substr(digit.length - 2);
	},	
	/*
	 * create image tags for languages (called for each movie) and add language option to selection
	 * kodiLang is the object of streamdetails from the media
	 */
	pathToFlags: function(kodiLang){
		var returnstring = "";
		
		for (var j=0;  j < kodiLang.length; j++){//go trough whole audio list
			if(kodiLang[j]["language"] == ""||kodiLang[j]["isocode"] == "und"){//if langague is empty string or code for "Undetermined" it's like unknown
				returnstring += "";
			} else {
				if(kodiLang[j].flag == ""){ //if there is no flag set, write out the name/description of the language
					returnstring += "[" + kodiLang[j]["native"] + "]&nbsp";
				} else {
					returnstring += "<img class='pathToFlags' alt='flag for " 
						+ kodiLang[j].native + " ("+kodiLang[j].native+")' src='resources/images/flags/" 
						+ kodiLang[j].flag + ".png' "
						+ "title='"+ kodiLang[j].native + " ("+kodiLang[j].isocode+")' />&nbsp;";
				}
			}
		}

		if (returnstring == "") {
			returnstring += yTools.ts("LANG_UNKNOWN");
		}
		return returnstring;
	},
    /*
     * gives back proper image link
     * if type="0" and empty image string, it gives back the questionsmark pic instead of file or folder pic
     */
    imageUrlNormalizer: function(imageLink, type){
       
        if(imageLink === undefined){
            imageLink = "none";
        }
      
        //handling empty linkstring
        if(imageLink == ""){
            if(type == "?"){ return "resources/images/nofile.png";}
            if(type == "file" || type == "media") {
                return "resources/images/file.png";
            } else {
                return "resources/images/folder.png";
            }
        }
        
        //cut away slash if in the end
        if(imageLink.match("/$") || imageLink.match("%2f$")|| imageLink.match("%2F$")) {
            imageLink = imageLink.slice(0, -1);
        }
        
        //cut away http and add image compressor link if needed
        if(imageLink.indexOf("http://") >=0 || imageLink.indexOf("http%3a%2f%2f") >=0 || imageLink.indexOf("http%3A%2F%2F") >=0){
            imageLink = decodeURIComponent(imageLink);
            if(imageLink.indexOf("image://") >= 0){
                imageLink = imageLink.substring(8);
            }
            if(yS.yS.prevImgQualMovies == 95){return imageLink;}
            return "http://images.weserv.nl/?url=" 
                + imageLink.substring(7)
                + "&h=85&t=fit&q=" + yS.yS.prevImgQualMovies;
        }
        
//         alert(imageLink);
        //cut away https and add image compressor link if needed
        if(imageLink.indexOf("https://") >=0 || imageLink.indexOf("https%3a%2f%2f") >=0 || imageLink.indexOf("https%3A%2F%2F") >=0){
            imageLink = decodeURIComponent(imageLink);
            if(imageLink.indexOf("image://") >= 0){
                imageLink = imageLink.substring(8);
            }
            if(yS.yS.prevImgQualMovies == 95){return imageLink;}
            return "http://images.weserv.nl/?url=" 
                + imageLink.substring(8)
                + "&h=85&t=fit&q=" + yS.yS.prevImgQualMovies;
        }
        
        //if it is not one of above, it is a lokal image
        return "http://" + $(location).attr('host') + "/image/" + encodeURIComponent(imageLink);
    }
}

/*
 * manages everything in connection with Settings in localstorage
 */
var yS = {
    yS: {}, //the settings are stored in this object (function yS (yarc Settings) object yS (yarc Settings))	
	/*
	* prepares the settingspage 
	*/
	init: function(){      
		$("#language").val(yS.yS.language);
		$("#language").selectmenu("refresh");
	
		$('#xbmcName').val(yS.yS.kodiName);
		if(yS.yS.hidePrevPics){
			$('input[name=hidePrevPics]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hidePrevPics]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideMenuText){
			$('input[name=hideMenuText]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideMenuText]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideWatched){
			$('input[name=hideWatched]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideWatched]').prop("checked", false).checkboxradio("refresh");
		}
		
		$('#listLength').val(yS.yS.listLength);
		
		if(yS.yS.hideGenreMovies){
			$('input[name=hideGenreMovies]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideGenreMovies]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideLanguageMovies){
			$('input[name=hideLanguageMovies]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideLanguageMovies]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideSearchMovies){
			$('input[name=hideSearchMovies]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideSearchMovies]').prop("checked", false).checkboxradio("refresh");
		}
	
		if(yS.yS.noSwipe){
			$('input[name=noSwipe]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=noSwipe]').prop("checked", false).checkboxradio("refresh");
		}
	
		if(yS.yS.swapSwipeDirections){
			$('input[name=swapSwipeDirections]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=swapSwipeDirections]').prop("checked", false).checkboxradio("refresh");
		}
		
		$('#swipeHight').val(yS.yS.swipeHight);
		
		if(yS.yS.hideOrientNav){
			$('input[name=hideOrientNav]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideOrientNav]').prop("checked", false).checkboxradio("refresh");
		}
		
		if(yS.yS.hideFileLinkMovies){
			$('input[name=hideFileLinkMovies]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideFileLinkMovies]').prop("checked", false).checkboxradio("refresh");
		}
		
		$('#prevImgQualMovies').val(yS.yS.prevImgQualMovies);

		if(yS.yS.hideGenreMusic){
			$('input[name=hideGenreMusic]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideGenreMusic]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideSearchMusic){
			$('input[name=hideSearchMusic]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideSearchMusic]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideGenreAddons){
				$('input[name=hideGenreAddons]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideGenreAddons]').prop("checked", false).checkboxradio("refresh");
		}
		if(yS.yS.hideSearchAddons){
			$('input[name=hideSearchAddons]').prop("checked", true).checkboxradio("refresh");
		} else{
			$('input[name=hideSearchAddons]').prop("checked", false).checkboxradio("refresh");
		}
		
		$("#listLength").blur(function(e) {
			$("#listLength_label").css('color', 'white');
			$("#saveSettings").button('enable');
			var numericReg = /^\d*[0-9]?$/;
			if (!numericReg.test($('[name=listLength]').val())) {
				alert(yTools.ts("ALERT_LISTLENGTH"));
				$("#saveSettings").button('disable');
				$("#listLength_label").css('color', 'red');
				return false;
			}
			if ($('[name=listLength]').val() == "") {
				alert(yTools.ts("ALERT_LISTLENGTH"));
				$("#saveSettings").button('disable');
				$("#listLength_label").css('color', 'red');
				return false;
			}
			return false;
		});
		
		$("#prevImgQualMovies").blur(function(e) {
			$("#prevImgQualMovies_label").css('color', 'white');
			$("#saveSettings").button('enable');
			var rangeReg = /(9[0-5]|[1-8][0-9])/;//0?[0-9]|[0-9]|[1-8][0-9]|9[0-5]
			if (!rangeReg.test($('[name=prevImgQualMovies]').val())) {
				alert(yTools.ts("ALERT_IMAGE_QUAL"));
				$("#saveSettings").button('disable');
				$("#prevImgQualMovies_label").css('color', 'red');
				return false;
			}
			return false;
		});
		
		$("#swipeHight").blur(function(e) {
			$("#swipeHight_label").css('color', 'white');
			$("#saveSettings").button('enable');
			var rangeReg = /^[0-9]+(em|ex|px|vh)/;
			if (!rangeReg.test($('[name=swipeHight]').val())) {
				alert(yTools.ts("ALERT_SWIPEHIGHT"));
				$("#saveSettings").button('disable');
				$("#swipeHight_label").css('color', 'red');
				return false;
			}
			return false;
		});
	
		$("#saveSettings").click(function(e) {
			e.stopImmediatePropagation();
			yS.saveSettings();
		});		
	},
	/*
     * check if localstorage key set, if not, create initial setting
     */
	localStorageInit: function(){ 
      if (localStorage.getItem("yarcSettings") === null) {
         yS.yS = {};
      } else {
        //get settings from local storage and save it in Settings Object
        yS.yS = JSON.parse(localStorage.getItem('yarcSettings'));
      }
      
      //checks if addons are in settings and creates object if needed
      if (!(yS.yS.hasOwnProperty('addons'))) {
        yS.yS.addons = {};
        yS.saveSettingsToLocalStorage();
      }
      
      if (!(yS.yS.hasOwnProperty('moviePageSettings'))) {
        yS.yS.moviePageSettings = {};
        if (!(yS.yS.moviePageSettings.hasOwnProperty('genreselect'))) {
            yS.yS.moviePageSettings.genreselect = "all";
        }
        if (!(yS.yS.moviePageSettings.hasOwnProperty('languageSelect'))) {
            yS.yS.moviePageSettings.languageSelect = "all";
        }
      }
      
      if (!(yS.yS.hasOwnProperty('musicPageSettings'))) {
        yS.yS.musicPageSettings = {};
        if (!(yS.yS.musicPageSettings.hasOwnProperty('genreselect'))) {
            yS.yS.musicPageSettings.genreselect = "all";
        }
      }
      
      if (!(yS.yS.hasOwnProperty('addonPageSettings'))) {
        yS.yS.addonPageSettings = {};
        if (!(yS.yS.addonPageSettings.hasOwnProperty('addonselect'))) {
            yS.yS.addonPageSettings.addonselect = "all";
        }
      }
      
      //check if all settings are set, if not, set with default value
      if (!(yS.yS.hasOwnProperty('language'))) {
          yS.yS.language = "en";
      }
      if (!(yS.yS.hasOwnProperty('kodiName'))) {
          yS.yS.kodiName = "yarc";
      }
      if (!(yS.yS.hasOwnProperty('hideMenuText'))) {
          yS.yS.hideMenuText = false;
      }
      if (!(yS.yS.hasOwnProperty('hidePrevPics'))) {
          yS.yS.hidePrevPics = false;
      }
      if (!(yS.yS.hasOwnProperty('hideWatched'))) {
          yS.yS.hideWatched = false;
      }
      if (!(yS.yS.hasOwnProperty('hideGenreMovies'))) {
          yS.yS.hideGenreMovies = false;
      }
      if (!(yS.yS.hasOwnProperty('hideLanguageMovies'))) {
          yS.yS.hideLanguageMovies = false;
      }
      if (!(yS.yS.hasOwnProperty('noSwipe'))) {
          yS.yS.noSwipe = false;
      }
      if (!(yS.yS.hasOwnProperty('swapSwipeDirections'))) {
          yS.yS.swapSwipeDirections = false;
      }
      if (!(yS.yS.hasOwnProperty('swipeHight'))) {
          yS.yS.swipeHight = "300px";
      }
      if (!(yS.yS.hasOwnProperty('hideOrientNav'))) {
          yS.yS.hideOrientNav = false;
      }
      if (!(yS.yS.hasOwnProperty('hideSearchMovies'))) {
          yS.yS.hideSearchMovies = false;
      }
      if (!(yS.yS.hasOwnProperty('hideFileLinkMovies'))) {
          yS.yS.hideFileLinkMovies = false;
      }
      if (!(yS.yS.hasOwnProperty('prevImgQualMovies'))) {
          yS.yS.prevImgQualMovies = 95;
      }
      if (!(yS.yS.hasOwnProperty('hideGenreMusic'))) {
          yS.yS.hideGenreMusic = false;
      }
      if (!(yS.yS.hasOwnProperty('hideSearchMusic'))) {
          yS.yS.hideSearchMusic = false;
      }
      if (!(yS.yS.hasOwnProperty('hideGenreAddons'))) {
          yS.yS.hideGenreAddons = false;
      }
      if (!(yS.yS.hasOwnProperty('hideSearchAddons'))) {
          yS.yS.hideSearchAddons = false;
      }
      if (!(yS.yS.hasOwnProperty('listLength'))) {
          yS.yS.listLength = 20;
      }
      
      //save settings again
      yS.saveSettingsToLocalStorage();
	},
	/*
     * write settings if settingpage gets closed
     */
	saveSettings: function(){
		$('#settings input[type=checkbox]').each(function () {
			if($(this).is(':checked')){
              yS.yS[$(this).val()] = true;
			} else {
              yS.yS[$(this).val()] = false;
			}
		});		
        yS.yS.language = $('[name=language]').val();
		yS.yS.kodiName = $('[name=xbmcName]').val();
		yS.yS.swipeHight = $('[name=swipeHight]').val();
        if($('[name=listLength]').val() == 0){
          yS.yS.listLength = 9999999;
        } else {
          yS.yS.listLength = $('[name=listLength]').val();
        }
		yS.yS.prevImgQualMovies = $('[name=prevImgQualMovies]').val();
        
        yS.saveSettingsToLocalStorage();
        
		window.location.href = "index.html";
	},
	/*
     * does what it says
     */
	saveSettingsToLocalStorage: function(){
      localStorage.setItem('yarcSettings', JSON.stringify(yS.yS));      
	}
}

/*
 * manages everything which has to be run, eighter in general, or if page gets called 
 */
$(document).delegate(document, 'pageshow', yFooter.init);
$(document).delegate(document, 'pageshow', yCore.init);
$(document).delegate('', 'pageshow', yRemote.init);
$(document).delegate('#pl', 'pageshow', yPl.init);//playlist
$(document).delegate('#movies', 'pageshow', yMovies.init);
$(document).delegate('#series', 'pageshow', ySeries.init);
$(document).delegate('#music', 'pageshow', yMusic.init);
$(document).delegate('#music-songsearch', 'pageshow', ySongSearch.init);
$(document).delegate('#addons', 'pageshow', yAddons.init);
$(document).delegate('#detailspopupAddons', 'pageshow', yAddons.init);
$(document).delegate('#settings', 'pageshow', yS.init);






		

