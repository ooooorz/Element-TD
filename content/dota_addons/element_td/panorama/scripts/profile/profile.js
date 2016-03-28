"use strict";

var statsURL = 'http://hatinacat.com/leaderboard/data_request.php?req=stats&id='
var friendsURL = 'http://hatinacat.com/leaderboard/data_request.php?req=friends&id='
var ranksURL = 'http://hatinacat.com/leaderboard/data_request.php?req=player&ids='
var Profile = $("#Profile")
var CustomBuilders = $("#CustomBuilders")
var friendsPanel = $("#FriendsContainer")
var currentProfile;
var currentLB = 0;
var friendsRank
var friends = []
var Stats = {} //cache everything

function GetStats(steamID32) {
    ClearFields()
    $.Msg("Getting stats data for "+steamID32+"...")

    $.AsyncWebRequest( statsURL+steamID32, { type: 'GET', 
        success: function( data ) {
            var info = JSON.parse(data);
            var player_info = info["player"]

            var allTime = player_info["allTime"]
            if (allTime === undefined)
                return

            Stats[player_info["steamID"]] = player_info

            $("#GamesWon").text = allTime["gamesWon"]
            $("#BestScore").text = GameUI.FormatScore(allTime["bestScore"])

            // General
            $("#kills").text = GameUI.FormatNumber(allTime["kills"])
            $("#frogKills").text = GameUI.FormatNumber(allTime["frogKills"])
            $("#networth").text = GameUI.FormatGold(allTime["networth"])
            $("#interestGold").text = GameUI.FormatGold(allTime["interestGold"])
            $("#cleanWaves").text = GameUI.FormatNumber(allTime["cleanWaves"])
            $("#under30").text = GameUI.FormatNumber(allTime["under30"])

            // GameMode
            $.Msg(allTime)
            MakeBars(allTime, ["normal","hard","veryhard","insane"])
            MakeBoolBar(allTime, "order_chaos")
            MakeBoolBar(allTime, "horde_endless")
            MakeBoolBar(allTime, "express")

            var random = allTime["random"]
            var gamesPlayed = allTime["gamesPlayed"]
            $("#random").text = random+" ("+(random/gamesPlayed*100).toFixed(0)+"%)"
            $("#towersBuilt").text = GameUI.FormatNumber(Number(allTime["towers"]) + Number(allTime["towersSold"]))
            $("#towersSold").text = GameUI.FormatNumber(allTime["towersSold"])
            $("#lifeTowerKills").text = GameUI.FormatNumber(allTime["lifeTowerKills"])
            $("#goldTowerEarn").text = GameUI.FormatGold(allTime["goldTowerEarn"])

            // Towers
            
            // Element Usage
            var light = allTime["light"]
            var dark = allTime["dark"]
            var water = allTime["water"]
            var fire = allTime["fire"]
            var nature = allTime["nature"]
            var earth = allTime["earth"]
            var total_elem = light+dark+water+fire+nature+earth
            var favorite = allTime["favouriteElement"]

            var nextStart = 0
            nextStart = RadialStyle("light", nextStart, light/total_elem)
            nextStart = RadialStyle("dark", nextStart, dark/total_elem)
            nextStart = RadialStyle("water", nextStart, water/total_elem)
            nextStart = RadialStyle("fire", nextStart, fire/total_elem)
            nextStart = RadialStyle("nature", nextStart, nature/total_elem)
            nextStart = RadialStyle("earth", nextStart, earth/total_elem)

            // Milestones
            var milestones = player_info["milestones"]
            if (milestones === undefined)
                return

            for (var i in milestones) {
                $.Msg(milestones[i])
            };

            $("#ClassicRank").text = (player_info["rank"] === undefined) ? "--" : GameUI.FormatRank(player_info["rank"]);
            $("#ExpressRank").text = (player_info["rank_exp"] === undefined) ? "--" : GameUI.FormatRank(player_info["rank_exp"]);
            $("#FrogsRank").text = (player_info["rank_frogs"] === undefined) ? "--" : GameUI.FormatRank(player_info["rank_frogs"]);
        }
    })

    //GetRank(steamID32, 0, "ClassicRank")
    //GetRank(steamID32, 1, "ExpressRank")
    //GetRank(steamID32, 2, "FrogsRank")
}

function ClearFields() {
    $("#GamesWon").text = "-"
    $("#BestScore").text = "-"

    // General
    $("#kills").text = "-"
    $("#frogKills").text = "-"
    $("#networth").text = "-"
    $("#interestGold").text = "-"
    $("#cleanWaves").text = "-"
    $("#under30").text = "-"

    // GameMode
    var data = []
    data["gamesPlayed"] = 4
    data["normal"] = 1
    data["hard"] = 1
    data["veryhard"] = 1
    data["insane"] = 1
    data["order_chaos"] = 0
    data["horde_endless"] = 0
    data["express"] = 0

    MakeBars(data, ["normal","hard","veryhard","insane"])
    MakeBoolBar(data, "order_chaos")
    MakeBoolBar(data, "horde_endless")
    MakeBoolBar(data, "express")

    var random = "-"
    $("#gamesPlayed").text = 0
    $("#random").text = "-"
    $("#towersBuilt").text = "-"
    $("#towersSold").text = "-"
    $("#lifeTowerKills").text = "-"
    $("#goldTowerEarn").text = "-"

    // Towers

    // Element Usage
    var light = 1
    var dark = 1
    var water = 1
    var fire = 1
    var nature = 1
    var earth = 1
    var total_elem = light+dark+water+fire+nature+earth
    var favorite = "-"

    var nextStart = 0
    nextStart = RadialStyle("light", nextStart, light/total_elem)
    nextStart = RadialStyle("dark", nextStart, dark/total_elem)
    nextStart = RadialStyle("water", nextStart, water/total_elem)
    nextStart = RadialStyle("fire", nextStart, fire/total_elem)
    nextStart = RadialStyle("nature", nextStart, nature/total_elem)
    nextStart = RadialStyle("earth", nextStart, earth/total_elem)

    $("#ClassicRank").text = "--"
    $("#ExpressRank").text = "--"
    $("#FrogsRank").text = "--"
}

function GetRank (steamID32, leaderboard_type, panelName) {
    $.AsyncWebRequest( ranksURL+steamID32+"&lb="+leaderboard_type, { type: 'GET', 
        success: function( data ) {

            var info = JSON.parse(data);
            var players_info = info["players"]

            for (var i in players_info)
            {
                $("#"+panelName).text = GameUI.FormatRank(players_info[i].rank);
            }
        }
    })
}

function GetPlayerFriends(steamID32, leaderboard_type) {
    $.Msg("Getting friends data for "+steamID32+"...")

    friendsRank = 0
    currentProfile = steamID32
    var delay = 0
    var delay_per_panel = 0.1;

    for (var i = 0; i < friends.length; i++) {
        friends[i].DeleteAsync(0)
    };
    friends = []

    $.AsyncWebRequest( friendsURL+steamID32+"&lb="+leaderboard_type, { type: 'GET', 
        success: function( data ) {
            var info = JSON.parse(data);
            var players_info = info["players"]
            
            if (!players_info){
                $.Msg("Private Profile")
                return
            }

            var self_player_rank = info["self"]
            if (self_player_rank)
                players_info.push(self_player_rank)

            // Sort by rank
            players_info.sort(function(a, b) {
                return parseInt(a.rank) - parseInt(b.rank);
            });

            for (var i in players_info)
            {
                var callback = function( data )
                {
                    return function(){ 
                        if (currentProfile == steamID32 && currentLB == leaderboard_type)
                            CreateFriendPanel(data) 
                    }
                }( players_info[i] );

                $.Schedule( delay, callback )
                delay += delay_per_panel;
            }
        }
    })
}

function CreateFriendPanel(data) {
    friendsRank++

    var steamID64 = GameUI.ConvertID64(data.steamID)
    var playerPanel = $.CreatePanel("Panel", friendsPanel, "Friend_"+steamID64)
    playerPanel.steamID = steamID64
    playerPanel.score = GameUI.FormatScore(data.score)
    playerPanel.friendRank = friendsRank
    playerPanel.rank = GameUI.FormatRank(data.rank)
    playerPanel.percentile = GameUI.FormatPercentile(data.percentile)
    playerPanel.BLoadLayout("file://{resources}/layout/custom_game/profile_friend.xml", false, false);

    playerPanel.SetPanelEvent( "onactivate", function(){ LoadProfile(steamID64) })
    friends.push(playerPanel)

    var steamID = GameUI.GetLocalPlayerSteamID()
    if (steamID64 == steamID)
        playerPanel.AddClass("local")
}

function LoadProfile(steamID64) {
    $.Msg("Loading profile of player "+steamID64)

    $("#AvatarImageProfile").steamid = steamID64
    $("#UserNameProfile").steamid = steamID64

    currentProfile = GameUI.ConvertID32(steamID64)
    GetStats(currentProfile)
    ShowFriendRanks("classic", true)
}

function ToggleProfile() {
    Profile.ToggleClass("Hide")

    Game.EmitSound("ui_generic_button_click")

    // Load self in the background
    if (Profile.BHasClass( "Hide" ))
        LoadLocalProfile()

    CloseCustomBuilders()
}

function CloseProfile() {
    Profile.SetHasClass( "Hide", true )
}
function CloseCustomBuilders(argument) {
    CustomBuilders.SetHasClass( "Hide", true )
}

function ToggleCustomBuilders() {
    Game.EmitSound("ui_generic_button_click")
    CustomBuilders.ToggleClass("Hide")
    CloseProfile()
}

var LB_types = ["classic","express","frogs"]
function ShowFriendRanks(leaderboard_type, force) {
    for (var i = 0; i < LB_types.length; i++) {
        var name = LB_types[i]
        var panel = $("#"+name+"_radio")
        panel.SetHasClass( "ActiveTab", LB_types[i] == leaderboard_type )
    };

    if (!force)
        Game.EmitSound("ui_rollover_micro")

    currentLB = LB_types.indexOf(leaderboard_type)
    GetPlayerFriends(currentProfile, currentLB)
}

var leftNames = ["stats","matches","achievements"]
function ShowProfileInfo ( panelTabName ) {
    $.Msg(name)

    for (var i = 0; i < leftNames.length; i++) {
        var name = leftNames[i]
        var panel = $("#"+name+"_radio")
        panel.SetHasClass( "ActiveTab", leftNames[i] == panelTabName )
    };

    Game.EmitSound("ui_rollover_micro")
}

function MakeButtonVisible() {
    var bShowProfile = GameUI.PlayerHasProfile(Game.GetLocalPlayerID())
    $("#ProfileToggleContainer").SetHasClass("Hide", !bShowProfile)
}

function LoadLocalProfile() {
    var steamID64 = GameUI.GetLocalPlayerSteamID()
    LoadProfile(steamID64)

    $("#AvatarImageMini").steamid = steamID64

    //ToggleProfile()
}

(function () {
    $.Schedule(0.1, function()
    {
        if (Players.HasCustomGameTicketForPlayerID(Game.GetLocalPlayerID()) || GameUI.RewardLevel(GameUI.GetLocalPlayerSteamID()) != 0)
        {
            MakeButtonVisible()
            LoadLocalProfile()
        }
    })
})();