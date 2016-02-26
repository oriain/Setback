<%@ Page Title="Home Page" Language="C#" MasterPageFile="~/Site.master" AutoEventWireup="true"
    CodeBehind="Default.aspx.cs" Inherits="setbackAspWeb._Default" %>

<asp:Content ID="HeaderContent" runat="server" ContentPlaceHolderID="HeadContent">
    <script src="//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js" ></script>
    <script src="//js.pusher.com/1.12/pusher.min.js" type="text/javascript"></script>
    <script src="/Scripts/Test.js" type="text/javascript"></script>
</asp:Content>
<asp:Content ID="BodyContent" runat="server" ContentPlaceHolderID="MainContent">

    <asp:LinkButton ID="CreateNewGame" runat="server" OnClick="CreateNewGame_Click" Text="Create a New Game" />
    
    <h3>List of current games:</h3>
    <asp:Literal ID="ListOfGames" runat="server" />


    <%--<hr />
    <asp:Literal ID="auth_signature" runat="server" />
    <asp:Literal ID="auth_timestamp" runat="server" />
    <a href="#" id="triggerFoo">Trigger 'foo' (event) on 'project-3' (channel)</a>--%>

    <%--<h2><a href="Join.aspx">Join</a></h2>
    <h2><a href="LogIn.aspx">Log In</a></h2>
    <h2><a href="Game.aspx">Play Anonymously</a></h2>--%>

    <%--<h2>
        Welcome to ASP.NET!
    </h2>
    <p>
        To learn more about ASP.NET visit <a href="http://www.asp.net" title="ASP.NET Website">www.asp.net</a>.
    </p>
    <p>
        You can also find <a href="http://go.microsoft.com/fwlink/?LinkID=152368&amp;clcid=0x409"
            title="MSDN ASP.NET Docs">documentation on ASP.NET at MSDN</a>.
    </p>--%>
</asp:Content>
