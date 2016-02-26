<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Game.aspx.cs" Inherits="setbackAspWeb.Game" %>

<!DOCTYPE html>
<%--<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">--%>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Setback</title>
    <link href="Styles/Setback.css" rel="stylesheet" type="text/css" />
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js" ></script>
    <script src="Scripts/jQueryRotate.2.2.js" type="text/javascript"></script>
    <script src="//js.pusher.com/1.12/pusher.min.js" type="text/javascript"></script>
    <%--<link href="//code.jquery.com/ui/1.10.1/themes/base/jquery-ui.css" rel="stylesheet" type="text/css" />--%>
    <script src="Scripts/noty/jquery.noty.js" type="text/javascript"></script>
    <script src="Scripts/noty/layouts/top.js" type="text/javascript"></script>
    <script src="Scripts/noty/themes/default.js" type="text/javascript"></script>
    <script src="//code.jquery.com/ui/1.10.1/jquery-ui.js" type="text/javascript"></script>
    <script src="Scripts/Functions.js" type="text/javascript"></script>
    <script src="Scripts/Setback.js" type="text/javascript"></script>
    <script src="Scripts/PusherBindings.js" type="text/javascript"></script>
    <script src="Scripts/opentip-jquery-excanvas.js"></script>
    <link href="Styles/opentip.css" rel="stylesheet" type="text/css" />
</head>
<body>
    <form id="form1" runat="server">
    <div>
    <a href="Default.aspx">Return to game listing</a> | <a href="#" id="DiscardConfirmation">Take away the marked cards!</a>

    <div id="GameBoard">
        <asp:Literal ID="GameId" runat="server" />

        <asp:Literal ID="jsVars" runat="server" />

        <div id="Card1" class="PlayedCard"></div>
        <div id="Card2" class="PlayedCard"></div>
        <div id="Card3" class="PlayedCard"></div>
        <div id="Card4" class="PlayedCard"></div>

        <div id="Player1" class="Player">
            <asp:Literal ID="Player1Id" runat="server" />
            <p><asp:Label ID="Player1Name" runat="server" /><span class="BidText"></span></p>
            <div class="BiddingControls"><input type="hidden" value="Player1" /><label>Input bid here:<br /><input type="text" /></label>
            <br /><a href="#" class="SubmitBid">Submit Bid</a> | <a href="#" class="PassBid">Pass Bid</a></div>
            <div class="TrumpControls">
                <input type="hidden" value="Player1" />Select the Trump:
                <ul>
                    <li><a href="#" class="Diamonds">Diamonds (♦)</a></li>
                    <li><a href="#" class="Spades">Spades (♠)</a></li>
                    <li><a href="#" class="Hearts">Hearts (♥)</a></li>
                    <li><a href="#" class="Clubs">Clubs (♣)</a></li>
                </ul>
            </div>
            <div class="Cards"><asp:Literal ID="Player1Cards" runat="server" /></div>
        </div>
        <div id="Player2" class="Player">
            <asp:Literal ID="Player2Id" runat="server" />
            <p><asp:Label ID="Player2Name" runat="server" /><span class="BidText"></span></p>
            <div class="BiddingControls"><input type="hidden" value="Player2" /><label>Input bid here:<br /><input type="text" /></label>
            <br /><a href="#" class="SubmitBid">Submit Bid</a> | <a href="#" class="PassBid">Pass Bid</a></div>
            <div class="TrumpControls">
                <input type="hidden" value="Player2" />Select the Trump:
                <ul>
                    <li><a href="#" class="Diamonds">Diamonds (♦)</a></li>
                    <li><a href="#" class="Spades">Spades (♠)</a></li>
                    <li><a href="#" class="Hearts">Hearts (♥)</a></li>
                    <li><a href="#" class="Clubs">Clubs (♣)</a></li>
                </ul>
            </div>
            <div class="Cards"><asp:Literal ID="Player2Cards" runat="server" /></div>
        </div>
        <div id="Player3" class="Player">
            <asp:Literal ID="Player3Id" runat="server" />
            <p><asp:Label ID="Player3Name" runat="server" /><span class="BidText"></span></p>
            <div class="BiddingControls"><input type="hidden" value="Player3" /><label>Input bid here:<br /><input type="text" /></label>
            <br /><a href="#" class="SubmitBid">Submit Bid</a> | <a href="#" class="PassBid">Pass Bid</a></div>
            <div class="TrumpControls">
                <input type="hidden" value="Player3" />Select the Trump:
                <ul>
                    <li><a href="#" class="Diamonds">Diamonds (♦)</a></li>
                    <li><a href="#" class="Spades">Spades (♠)</a></li>
                    <li><a href="#" class="Hearts">Hearts (♥)</a></li>
                    <li><a href="#" class="Clubs">Clubs (♣)</a></li>
                </ul>
            </div>
            <div class="Cards"><asp:Literal ID="Player3Cards" runat="server" /></div>
        </div>
        <div id="Player4" class="Player">
            <asp:Literal ID="Player4Id" runat="server" />
            <p><asp:Label ID="Player4Name" runat="server" /><span class="BidText"></span></p>
            <div class="BiddingControls"><input type="hidden" value="Player4" /><label>Input bid here:<br /><input type="text" /></label>
            <br /><a href="#" class="SubmitBid">Submit Bid</a> | <a href="#" class="PassBid">Pass Bid</a></div>
            <div class="TrumpControls">
                <input type="hidden" value="Player4" />Select the Trump:
                <ul>
                    <li><a href="#" class="Diamonds">Diamonds (♦)</a></li>
                    <li><a href="#" class="Spades">Spades (♠)</a></li>
                    <li><a href="#" class="Hearts">Hearts (♥)</a></li>
                    <li><a href="#" class="Clubs">Clubs (♣)</a></li>
                </ul>
            </div>
            <div class="Cards"><asp:Literal ID="Player4Cards" runat="server" /></div>
        </div>
        <div id="Widow" class="Player">
            <asp:Literal ID="WidowId" runat="server" />
            <p>Widow</p>
            <div class="Cards"><asp:Literal ID="WidowCards" runat="server" /></div>
        </div>
        <div id="Discard" class="Player">
            <asp:Literal ID="DiscardId" runat="server" />
            <p>Discard Pile</p>
            <div class="Cards"><asp:Literal ID="DiscardCards" runat="server" /></div>
        </div>
        <div id="Deck" class="Player">
            <input type="hidden" id="DeckId" value="Deck" />
            <p>Deck</p>
            <div class="Cards"><asp:Literal ID="DeckCards" runat="server" /></div>
        </div>
    </div>
    <div id="Moves"><asp:Literal ID="movesHistory" runat="server" /></div>

    </div>
    </form>
</body>
</html>
