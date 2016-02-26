/*
Editor
*/
var infograme_server_url = "http://infogra.me";
var infograme;
if(!infograme) {
    infograme = {};

    /*
    Utils
    */
    infograme.createDelegate = function(object, method) {
        var fn =  function() {
            return method.apply(object, arguments);
        };
        return fn;
    };
    infograme.commafy = function(num) {
        var str = num.toString().split('.');
        if (str[0].length >= 4) {
            str[0] = str[0].replace(/(\d)(?=(\d{3})+jQuery)/g, 'jQuery1,');
        }
        if (str[1] && str[1].length >= 5) {
            str[1] = str[1].replace(/(\d{3})/g, 'jQuery1 ');
        }
        return str.join('.');
    };
    infograme.cloneObject = function(object) {
        return jQuery.extend(true, {}, object);
    };
    infograme.grabPosition = function(e) {
        if(window.console) console.log(e);
        return {
            x:e.offsetX===undefined ? e.originalEvent.layerX : e.offsetX, 
            y:e.offsetY===undefined ? e.originalEvent.layerY : e.offsetY
        };
    };

    /*
    EventDispatcher
    */
    infograme.EventDispatcher = function() {
        this.eventListeners = {};
    };
    infograme.EventDispatcher.prototype.addEventListener = function(e, f) {
        if(!this.eventListeners[e]) {
            this.eventListeners[e] = [];
        }
        this.eventListeners[e].push(f);
        return this;
    };
    infograme.EventDispatcher.prototype.removeEventListener = function(e, f) {
        if(this.eventListeners[e]) {
            for(var i = this.eventListeners[e].length-1; 0 <= i; i--) {
                if(this.eventListeners[e][i] == f) {
                    this.eventListeners[e].splice(i,1);
                }
            }
        }
        return this;
    };
    infograme.EventDispatcher.prototype.dispatchEvent = function(e) {
        var args = [];
        for(var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        if(this.eventListeners[e]) {
            for(var j = 0; j < this.eventListeners[e].length; j++) {
                this.eventListeners[e][j].apply(this, args);
            }
        }
        return this;
    };

}
if(!infograme.editor) {
    infograme.editor = {};

    /*
    infograme.editor.Editor
    */
    infograme.editor.Editor = function(element, infographId, token, openAsEditor) {
        this.element = element;
        this.infographId = infographId;
        this.token = token;
        this.openAsEditor = openAsEditor;
        this.locale = "en_US";
        this.data = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.windowW = jQuery(this.element).width();
        this.width = null;
        this.height = null;
        this.imageHolder = jQuery(this.element).find(".infograme_editor_component_image").get(0);
        this.isHidingTags = false;
        this.currentCursorClass = null;
        this.tab = null;
        this.overlay = null;
        this.state = new infograme.editor.NoEditingState(this);

        this.getData(infographId);
    };
    infograme.editor.Editor.openBarH = 138;
    infograme.editor.Editor.closeBarH = 46;
    infograme.editor.Editor.tagLimit = 100;
    infograme.editor.Editor.prototype.getData = function(infographId) {
        if(window.console) console.log("Get data. infographId:", infographId);

        // var url = "_assets/editor_component/get_annotation.json";
        var url = infograme_server_url + "/api/infograph/annotation/get";

        // Load Json
        if (jQuery.browser.msie && window.XDomainRequest) {

            // Use Microsoft XDR
            var xdr = new XDomainRequest();
            xdr.open("get", url + "?infograph_id=" + infographId);
            xdr.onload = infograme.createDelegate(this, function () {
                var JSON = jQuery.parseJSON(xdr.responseText);
                if (JSON === null || typeof (JSON) == 'undefined')
                {
                    JSON = jQuery.parseJSON(data.firstChild.textContent);
                }
                this.processData(JSON);
            });
            xdr.onerror = function() {
                if(window.console) console.log("Error: couldn't get data on IE");
            };
            xdr.send();
        } else {
            jQuery.ajax({
                type: 'GET',
                url: url,
                processData: true,
                data: {infograph_id: infographId},
                dataType: "json",
                success: infograme.createDelegate(this, function (data) {
                    this.processData(data);
                })
            });
        }
    };
    infograme.editor.Editor.prototype.processData = function(data) {
        if(window.console) console.log("Got data. data:", data);
        this.data = data.result;
        this.width = jQuery(this.element).parent().width();
        this.height = this.width * (this.data.image_height / this.data.image_width);
        this.init();
        // this.loadImage();
    };
    infograme.editor.Editor.prototype.loadImage = function() {
        // Load and layout image
        var imageUrl = this.data.image_url;
        if(window.console) console.log("Load image:", imageUrl);
        this.image = new Image();
        this.image.src = imageUrl;
        jQuery(this.image).bind('load', infograme.createDelegate(this, function(e) {

            // dimensions from db
            if(window.console) console.log("IMG Size:",this.image.width, this.image.height);

            // get minimum of actual image width and width of container element (editor_component0) 
            this.width = Math.min(this.image.width, this.windowW);
            this.height = this.width * (this.image.height / this.image.width);
            this.image.height = this.height;
            this.image.width = this.width;
            jQuery(this.imageHolder).width(this.windowW).height(this.height);
            jQuery(this.imageHolder).html(this.image);

            if(window.console) console.log("Size:",this.width, this.height);

            this.init();
        }));
    };
    infograme.editor.Editor.prototype.init = function() {

        // Create annotations if there is not
        if (!this.data.annotations) {
            this.data.annotations = [];
        }

        // Update size
        jQuery(this.element).css('height', this.height + 'px');

        // Update overlay
        this.overlay = new infograme.editor.Overlay(this);
        this.overlay.updateSize(this.width, this.height);
        this.tab = new infograme.editor.Tab(this);

        // Instanciate existing tags
        for (var i = 0; i < this.data.annotations.length; i++) {
            var tag = this.addTag(this.data.annotations[i]);
            tag.unfocus();
        }

        // Init interaction
        jQuery(this.element).mouseleave(infograme.createDelegate(this, function() {
            this.state.handleMouseLeave();
        }));
        jQuery(this.imageHolder).click(infograme.createDelegate(this, function(e) {
            this.state.handleImageClick(e);
        }));

        if (this.openAsEditor) {
            this.updateState(new infograme.editor.EditingState(this));
        }
    };

    infograme.editor.Editor.prototype.addAnnotation = function(obj, successCallback) {
        var postObj = infograme.cloneObject(obj);
        postObj.token = this.token;
        postObj.locale = this.locale;
        if(postObj.x) postObj.x = postObj.x.toString();
        if(postObj.y) postObj.y = postObj.y.toString();
        if(postObj.width) postObj.width = postObj.width.toString();
        if(postObj.height) postObj.height = postObj.height.toString();
        postObj.infograph_id = this.data.infograph_id;

        if(window.console) console.log("Adding annotation. postObj:", postObj);

        var url = infograme_server_url + "/api/infograph/annotation/add";

        this.updateState(new infograme.editor.PostingState(this));

        jQuery.ajax({
            url: url,
            type: "POST",
            data: postObj,
            dataType: "json",
            processData: true,
            success: infograme.createDelegate(this, function(data) {
                if(window.console) console.log("Connection succeeded:", data);
                if (parseInt(data.is_success, 10)) {
                    successCallback(data);
                    this.updateState(new infograme.editor.EditingState(this));
                } else {
                    alert(data.error);
                    this.updateState(new infograme.editor.PopupEditingState(this));
                }
            }),
            error: infograme.createDelegate(this, function(jqXHR, textStatus, errorThrown) {
                alert("ERROR: add annotation");
                this.updateState(new infograme.editor.EditingState(this));
            })
        });
    };
    infograme.editor.Editor.prototype.deleteAnnotation = function(obj, successCallback) {
        var postObj = {};
        postObj.token = this.token;
        postObj.annotation_id = obj.id;

        if(window.console) console.log("Deleting annotation. postObj:", postObj);

        var url = infograme_server_url + "/api/infograph/annotation/delete";

        this.updateState(new infograme.editor.PostingState(this));

        jQuery.ajax({
            url: url,
            type: "GET",
            data: postObj,
            dataType: "json",
            processData: true,
            success: infograme.createDelegate(this, function(data) {
                if(window.console) console.log("Connection succeeded:", data);
                if (parseInt(data.is_success, 10)) {
                    successCallback(data);
                    this.updateState(new infograme.editor.EditingState(this));
                } else {
                    alert(data.error);
                    this.updateState(new infograme.editor.PopupEditingState(this));
                }
            }),
            error: infograme.createDelegate(this, function(jqXHR, textStatus, errorThrown) {
                alert("ERROR: delete annotation");
                this.updateState(new infograme.editor.EditingState(this));
            })
        });
    };
    infograme.editor.Editor.prototype.modifyAnnotation = function(obj, successCallback) {
        var postObj = infograme.cloneObject(obj);
        postObj.token = this.token;
        postObj.locale = this.locale;
        postObj.annotation_id = obj.id;
        if(postObj.x) postObj.x = postObj.x.toString();
        if(postObj.y) postObj.y = postObj.y.toString();
        if(postObj.width) postObj.width = postObj.width.toString();
        if(postObj.height) postObj.height = postObj.height.toString();
        delete postObj.infograph_id;
        delete postObj.id;

        if(window.console) console.log("Modifying annotation. postObj:", postObj);

        var url = infograme_server_url + "/api/infograph/annotation/modify";

        this.updateState(new infograme.editor.PostingState(this));

        jQuery.ajax({
            url: url,
            type: "POST",
            data: postObj,
            dataType: "json",
            processData: true,
            success: infograme.createDelegate(this, function(data) {
                if(window.console) console.log("Connection succeeded:", data);
                if (parseInt(data.is_success, 10)) {
                    successCallback(data);
                    this.updateState(new infograme.editor.EditingState(this));
                } else {
                    alert("ERROR", data.error);
                    this.updateState(new infograme.editor.PopupEditingState(this));
                }
            }),
            error: infograme.createDelegate(this, function(jqXHR, textStatus, errorThrown) {
                alert("ERROR: modify annotation");
                this.updateState(new infograme.editor.EditingState(this));
            })
        });
    };
    infograme.editor.Editor.prototype.toggleTagVisibility = function() {
        if (this.isHidingTags) {
            this.showTags();
        } else {
            this.hideTags();
        }
    };
    infograme.editor.Editor.prototype.disableInteraction = function() {
        jQuery(this.element).addClass("disabled");
    };
    infograme.editor.Editor.prototype.enableInteraction = function() {
        jQuery(this.element).removeClass("disabled");
    };
    infograme.editor.Editor.prototype.showTags = function() {
        this.isHidingTags = false;
        this.overlay.showTags();
        this.tab.updateHideTagsButton(this.isHidingTags);
    };
    infograme.editor.Editor.prototype.hideTags = function() {
        this.isHidingTags = true;
        this.overlay.hideTags();
        this.tab.updateHideTagsButton(this.isHidingTags);
    };
    infograme.editor.Editor.prototype.updateState = function(state) {
        if (state.constructor != this.state.constructor) {
            if(window.console) console.log("Update state", state);
            this.state.finishState();
            this.state = state;
            this.state.startState();
        }
    };
    infograme.editor.Editor.prototype.updateCursor = function(cursorClass) {
        if (this.currentCursorClass) {
            jQuery(this.element).removeClass(this.currentCursorClass);
        }
        jQuery(this.element).addClass(cursorClass);
        this.currentCursorClass = cursorClass;
    };
    infograme.editor.Editor.prototype.addNewLink = function(position) {
        var obj = {
            type: "link",
            x: position.x / this.width,
            y: position.y / this.height,
            url: null
        };
        this.data.annotations.push(obj);
        return this.addLink(obj);
    };
    infograme.editor.Editor.prototype.addNewText = function(position) {
        var obj = {
            type: "text",
            x: position.x / this.width,
            y: position.y / this.height,
            url: null,
            title: null,
            description: null
        };
        this.data.annotations.push(obj);
        return this.addText(obj);
    };
    infograme.editor.Editor.prototype.addNewArea = function(position) {
        var obj = {
            type: "area",
            x: position.x / this.width,
            y: position.y / this.height,
            width: 0,
            height: 0,
            url: null
        };
        this.data.annotations.push(obj);
        return this.addArea(obj);
    };
    infograme.editor.Editor.prototype.addTag = function(obj) {
        switch (obj.type) {
            case "link": return this.addLink(obj);
            case "text": return this.addText(obj);
            case "area": return this.addArea(obj);
        }
    };
    infograme.editor.Editor.prototype.addLink = function(obj) {
        return this.overlay.addLink(obj);
    };
    infograme.editor.Editor.prototype.addText = function(obj) {
        return this.overlay.addText(obj);
    };
    infograme.editor.Editor.prototype.addArea = function(obj) {
        return this.overlay.addArea(obj);
    };
    infograme.editor.Editor.prototype.removeTag = function(tag) {
        if(window.console) console.log("Remove tag:", tag);

        this.overlay.removeTag(tag);

        // remove tag from obj
        var tagId = tag.obj.id;
        if (tagId) {
            for (var i = 0; i < this.data.annotations.length; i++) {
                var obj = this.data.annotations[i];
                if (obj.id == tagId) {
                    this.data.annotations.splice(i, 1);
                    if(window.console) console.log("Tag obj was removed:", tagId);
                    break;
                }
            }
        }
    };
    infograme.editor.Editor.prototype.checkTagLimit = function() {
        if (this.data.annotations.length < infograme.editor.Editor.tagLimit) {
            return true;
        } else {
            alert("It exceeds the number of limitation of " + infograme.editor.Editor.tagLimit);
            return false;
        }
    };
    infograme.editor.Editor.prototype.animateToEditState = function() {
        this.overlay.animateToEditState();
        jQuery(this.imageHolder).animate({top:infograme.editor.Editor.openBarH+"px"});
        jQuery(this.element).animate({height:(this.height + infograme.editor.Editor.openBarH) + 'px'});
    };
    infograme.editor.Editor.prototype.animateToViewState = function() {
        this.overlay.animateToViewState();
        jQuery(this.imageHolder).animate({top:0});
        jQuery(this.element).animate({height:(this.height) + 'px'});
    };
    infograme.editor.Editor.prototype.animateToTabOpenState = function() {
        this.overlay.animateToTabOpenState();
        jQuery(this.imageHolder).animate({top:infograme.editor.Editor.closeBarH+"px"});
        jQuery(this.element).animate({height:(this.height + infograme.editor.Editor.closeBarH) + 'px'});
    };

    /*
    infograme.editor.Tab
    */
    infograme.editor.Tab = function(component) {
        this.component = component;
        this.element = jQuery(this.component.element).find(".infograme_editor_component_tab").get(0);
        this.cornerButton = jQuery(this.element).find(".infograme_corner_button").get(0);
        this.controlBar = jQuery(this.element).find(".infograme_control_bar").get(0);
        this.hideTagsButton = jQuery(this.element).find(".infograme_hide_tags_button").get(0);
        this.editTagsButton = jQuery(this.element).find(".infograme_edit_tags_button").get(0);
        this.downloadButton = jQuery(this.element).find(".infograme_ga_download");
        this.embedButton = jQuery(this.element).find(".infograme_ga_embed");
        this.zoomButton = jQuery(this.element).find(".infograme_ga_zoom");
        this.controlBarBg = jQuery(this.element).find(".infograme_control_bar_bg").get(0);
        this.editMenu = jQuery(this.element).find(".infograme_edit_menu").get(0);
        this.addLinkButton = jQuery(this.element).find(".infograme_add_link_button").get(0);
        this.addTextButton = jQuery(this.element).find(".infograme_add_text_button").get(0);
        this.addAreaButton = jQuery(this.element).find(".infograme_add_area_button").get(0);
        this.closeButton = jQuery(this.element).find(".infograme_bar_close_button").get(0);
        this.isOpened = false;

        jQuery(this.cornerButton).click(infograme.createDelegate(this, function(e) {
            this.component.updateState(new infograme.editor.TabOpenState(this.component));
        }), null);
        jQuery(this.closeButton).click(infograme.createDelegate(this, function(e) {
            this.component.state.handleBarCloseButtonClick();
            // if(!this.component.state.isEditing()) {
                // this.hideTab();
            // }
        }));
        jQuery(this.hideTagsButton).click(infograme.createDelegate(this, function(e) {
            this.component.toggleTagVisibility();
        }));
        jQuery(this.editTagsButton).click(infograme.createDelegate(this, function(e) {
            this.component.state.handleControlButtonClick('editTags');
        }));
        jQuery(this.addLinkButton).click(infograme.createDelegate(this, function(e) {
            if (this.component.checkTagLimit()) {
                this.component.state.handleControlButtonClick('link');
            }
        }));
        jQuery(this.addTextButton).click(infograme.createDelegate(this, function(e) {
            if (this.component.checkTagLimit()) {
                this.component.state.handleControlButtonClick('text');
            }
        }));
        jQuery(this.addAreaButton).click(infograme.createDelegate(this, function(e) {
            if (this.component.checkTagLimit()) {
                this.component.state.handleControlButtonClick('area');
            }
        }));
        jQuery(this.downloadButton).click(infograme.createDelegate(this, infograme.createDelegate(this, function(e) {
            window.open(this.component.data.image_url,'_blank');
        })));

        // // Setup fancybox
        // jQuery(this.embedButton).fancybox();

        // jQuery(this.embedButton).click(infograme.createDelegate(this, function(e) {
        //     var container = jQuery('#graphicsEmbed');
        //     container.find('textarea').attr('readonly','true');
        //     var widthInput = container.find('#imageWidthBox');
        //     widthInput.bind('keypress',function(e) {
        //         //e.preventDefault();
        //         if(typeof widthInput.val() === 'number') {
        //             //alert('this is a number');
        //             widthInput.css('color','');
        //         } else {
        //             widthInput.css('color','red');
        //         }
        //     })
        // }));

        // jQuery(this.zoomButton).attr('href', this.component.data.image_url);
        // jQuery(this.zoomButton).attr('href', this.component.data.image_url).fancybox({
        //     'autoSize': false,
        //     'fitToView': false,
        //     'scrolling': 'yes'
        // });
    };
    infograme.editor.Tab.prototype.showTab = function() {
        jQuery(this.cornerButton).hide();
        jQuery(this.controlBar).fadeIn(200);
    };
    infograme.editor.Tab.prototype.hideTab = function() {
        jQuery(this.controlBar).stop('fx').hide();
        jQuery(this.cornerButton).show();
    };
    infograme.editor.Tab.prototype.showHideTagsButton = function() {
        jQuery(this.hideTagsButton).show();
    };
    infograme.editor.Tab.prototype.hideHideTagsButton = function() {
        jQuery(this.hideTagsButton).hide();
    };
    infograme.editor.Tab.prototype.openEditControl = function() {
        if (!this.isOpened) {
            this.showTab();
            var height = infograme.editor.Editor.openBarH+"px";
            jQuery(this.element).animate({height:height});
            jQuery(this.controlBarBg).animate({height:height}, 400, "swing", infograme.createDelegate(this, function() {
                this.component.state.handleOpenedControl();
            }));
            jQuery(this.editTagsButton).html("Finish Editing");
            jQuery(this.editMenu).delay(400).fadeIn();
            jQuery(this.editMenu).children().hide().each(function(i) {
                jQuery(this).delay(i * 50 + 600).fadeIn();
            });
            this.isOpened = true;
        }
    };
    infograme.editor.Tab.prototype.closeEditControl = function() {
        if (this.isOpened) {
            var height = infograme.editor.Editor.closeBarH+"px";
            jQuery(this.element).animate({height:height});
            jQuery(this.controlBarBg).animate({height:height}, 400, "swing", infograme.createDelegate(this, function() {
                this.component.state.handleClosedControl();
            }));
            jQuery(this.editTagsButton).html("Edit Tags");
            jQuery(this.editMenu).hide();
            this.isOpened = false;
        }
    };
    infograme.editor.Tab.prototype.updateHideTagsButton = function(hiding) {
        if (hiding) {
            jQuery(this.hideTagsButton).html("Show Tags");
        } else {
            jQuery(this.hideTagsButton).html("Hide Tags");
        }
    };

    /*
    infograme.editor.Overlay
    */
    infograme.editor.Overlay = function(component) {
        this.component = component;
        this.element = jQuery(this.component.element).find(".infograme_editor_component_overlay").get(0);
        this.tagsHolder = jQuery(this.element).find(".infograme_tags_holder").get(0);
        this.bg = jQuery(this.element).find(".infograme_overlay_bg").get(0);
        this.tags = [];
        this.currentPoppedTag = null;

        this.showTags();

        jQuery(this.element).click(infograme.createDelegate(this, function(e) {
            this.component.state.handleOverlayClick(e);
        }));
        jQuery(this.element).mouseup(infograme.createDelegate(this, function(e) {
            this.component.state.handleOverlayMouseUp(e);
        }));
        jQuery(this.element).mousedown(infograme.createDelegate(this, function(e) {
            this.component.state.handleOverlayMouseDown(e);
        }));
        jQuery(this.element).mousemove(infograme.createDelegate(this, function(e) {
            this.component.state.handleOverlayMouseMove(e);
        }));
        jQuery(this.element).mouseleave(infograme.createDelegate(this, function(e) {
            this.component.state.handleOverlayMouseLeave(e);
        }));
    };
    infograme.editor.Overlay.prototype.updateSize = function(w, h) {
        jQuery(this.element).css({width: w+'px', height: h+'px'});
    };
    infograme.editor.Overlay.prototype.animateToEditState = function() {
        // move overlay
        jQuery(this.element).animate({top:infograme.editor.Editor.openBarH+"px"});
    };
    infograme.editor.Overlay.prototype.animateToViewState = function() {
        // move overlay
        jQuery(this.element).animate({top:0});
    };
    infograme.editor.Overlay.prototype.animateToTabOpenState = function() {
        jQuery(this.element).animate({top:infograme.editor.Editor.closeBarH+"px"});
    };
    infograme.editor.Overlay.prototype.showTags = function() {
        jQuery(this.tagsHolder).fadeIn();
    };
    infograme.editor.Overlay.prototype.hideTags = function() {
        jQuery(this.tagsHolder).fadeOut();
    };
    infograme.editor.Overlay.prototype.addLink = function(obj) {
        var tag = new infograme.editor.LinkTag(this.component, obj);
        this.tags.push(tag);
        return tag;
    };
    infograme.editor.Overlay.prototype.addText = function(obj) {
        var tag = new infograme.editor.TextTag(this.component, obj);
        this.tags.push(tag);
        return tag;
    };
    infograme.editor.Overlay.prototype.addArea = function(obj) {
        var area = new infograme.editor.LinkedArea(this.component, obj);
        this.tags.push(area);
        return area;
    };
    infograme.editor.Overlay.prototype.removeTag = function(tag) {
        tag.cleanUp();

        for (var i = 0; i < this.tags.length; i++) {
            var t = this.tags[i];
            if (t == tag) {
                this.tags.splice(i, 1);
                if(window.console) console.log("Tag was removed:", tag.obj.id);
                break;
            }
        }
    };
    infograme.editor.Overlay.prototype.enableAllTags = function() {
        jQuery(this.tagsHolder).children().removeClass("disabled");
        jQuery(this.bg).css("z-index", 0); // For IE
    };
    infograme.editor.Overlay.prototype.disableAllTags = function() {
        jQuery(this.tagsHolder).children().addClass("disabled");
        jQuery(this.bg).css("z-index", 100); // For IE
    };
    infograme.editor.Overlay.prototype.showPopup = function(tag) {
        if (this.currentPoppedTag != tag) {

            if(this.currentPoppedTag) {
                this.currentPoppedTag.popup.hidePopup();
            }

            tag.popup.showPopup();
            this.currentPoppedTag = tag;
        }
    };
    infograme.editor.Overlay.prototype.hidePopup = function(tag) {
        tag.popup.hidePopup();
        this.currentPoppedTag = null;
    };
    infograme.editor.Overlay.prototype.hideAllPopups = function() {
        for (var i = 0; i < this.tags.length; i++) {
            this.tags[i].popup.hidePopup();
        }
        this.currentPoppedTag = null;
    };
    infograme.editor.Overlay.prototype.removeAllPopups = function() {
        infograme.editor.AbstractPopup.removeAllPopups();
        this.currentPoppedTag = null;
    };
    infograme.editor.Overlay.prototype.updateEditingState = function(editing) {
        for (var i = 0; i < this.tags.length; i++) {
            this.tags[i].updateEditingState(editing);
        }
    };

    /*
    infograme.editor.AbstractTag
    */
    infograme.editor.AbstractTag = function(component, obj) {
        this.component = component;
        this.obj = obj;
        this.element = null;
        this.popup = null;
		this.tagMouseOutTimer = null;
    };
    infograme.editor.AbstractTag.prototype.initInteraction = function() {
        jQuery(this.element).mouseover(infograme.createDelegate(this, function(e) {
            this.focus();
            this.component.state.handleTagMouseOver(e, this);
        }));
        jQuery(this.element).mouseout(infograme.createDelegate(this, function(e) {
            this.unfocus();
			this.tagMouseOutTimer = setTimeout(this.component.state.handleTagMouseOut(e, this), 5000);
		}));
		$(document).on('mouseover', '.jquerybubblepopup', infograme.createDelegate(this, function(e) {
			clearTimeout(this.tagMouseOutTimer);
		}));
		$(document).on('mouseover', '.jquerybubblepopup', infograme.createDelegate(this, function(e) {
			this.tagMouseOutTimer = setTimeout(this.component.state.handleTagMouseOut(e, this), 5000);
		}));
        jQuery(this.element).click(infograme.createDelegate(this, function(e) {
            this.component.state.handleTagClick(e, this);
        }));
    };
    infograme.editor.AbstractTag.prototype.cleanUp = function() {
        this.popup.cleanUp();
        jQuery(this.element).remove();
    };
    infograme.editor.AbstractTag.prototype.focus = function() {
        jQuery(this.element).css({opacity:1});
    };
    infograme.editor.AbstractTag.prototype.unfocus = function() {
        jQuery(this.element).css({opacity:0.6});
    };
    infograme.editor.AbstractTag.prototype.enableTag = function() {
        jQuery(this.element).removeClass("disabled");
    };
    infograme.editor.AbstractTag.prototype.disableTag = function() {
        jQuery(this.element).addClass("disabled");
    };
    infograme.editor.AbstractTag.prototype.updateEditingState = function(editing) {
        if (editing) {
            jQuery(this.element).addClass("editing");
        } else {
            jQuery(this.element).removeClass("editing");
        }

        this.unfocus();
    };
    infograme.editor.AbstractTag.prototype.updateObj = function(obj) {
        this.obj = obj;
        this.popup.updateObj(obj);
    };

    /*
    infograme.editor.LinkTag
    */
    infograme.editor.LinkTag = function(component, obj) {
        infograme.editor.LinkTag.parent.constructor.call(this, component, obj);

        // Create tag
        this.element = jQuery(this.component.overlay.tagsHolder).append('<a class="infograme_link_tag" href="javascript:void(0)"></a>').children().last().get(0);
        var left = Math.floor(this.component.width * obj.x);
        var top = Math.floor(this.component.height * obj.y);
        jQuery(this.element).css({left: left+"px", top: top+"px"});

        // Create popup
        this.popup = new infograme.editor.LinkTagPopup(this.component, this, this.obj);

        this.initInteraction();
    };
    infograme.editor.LinkTag.prototype = new infograme.editor.AbstractTag();
    infograme.editor.LinkTag.prototype.constructor = infograme.editor.LinkTag;
    infograme.editor.LinkTag.parent = infograme.editor.AbstractTag.prototype;

    /*
    infograme.editor.TextTag
    */
    infograme.editor.TextTag = function(component, obj) {
        infograme.editor.TextTag.parent.constructor.call(this, component, obj);

        this.element = jQuery(this.component.overlay.tagsHolder).append('<a class="infograme_text_tag" href="javascript:void(0)"></a>').children().last().get(0);
        var left = Math.floor(this.component.width * obj.x);
        var top = Math.floor(this.component.height * obj.y);
        jQuery(this.element).css({left: left+"px", top: top+"px"});

        // Create popup
        this.popup = new infograme.editor.TextTagPopup(this.component, this, this.obj);

        this.initInteraction();
    };
    infograme.editor.TextTag.prototype = new infograme.editor.AbstractTag();
    infograme.editor.TextTag.prototype.constructor = infograme.editor.TextTag;
    infograme.editor.TextTag.parent = infograme.editor.AbstractTag.prototype;

    /*
    infograme.editor.LinkedArea
    */
    infograme.editor.LinkedArea = function(component, obj) {
        infograme.editor.LinkedArea.parent.constructor.call(this, component, obj);

        this.element = jQuery(this.component.overlay.tagsHolder).append('<div class="infograme_linked_area"><a href="javascript:void(0)"></a></div>').children().last().get(0);
        var left = Math.floor(this.component.width * obj.x);
        var top = Math.floor(this.component.height * obj.y);
        var width = Math.floor(this.component.width * obj.width);
        var height = Math.floor(this.component.height * obj.height);
        jQuery(this.element).css({left: left+"px", top: top+"px", width:width+"px", height:height+"px"});

        // Create popup
        this.popup = new infograme.editor.LinkedAreaPopup(this.component, this, this.obj);

        this.initInteraction();
    };
    infograme.editor.LinkedArea.prototype = new infograme.editor.AbstractTag();
    infograme.editor.LinkedArea.prototype.constructor = infograme.editor.LinkedArea;
    infograme.editor.LinkedArea.parent = infograme.editor.AbstractTag.prototype;
    infograme.editor.LinkedArea.prototype.resizeArea = function(toPosition) {
        var x = this.component.width * this.obj.x;
        var y = this.component.height * this.obj.y;
        var width = toPosition.x - x;
        var height = toPosition.y - y;
        if (width < 0) {
            x = toPosition.x;
            width *= -1;
        }
        if (height < 0) {
            y = toPosition.y;
            height *= -1;
        }
        jQuery(this.element).css({left:x+'px',top:y+'px',width:width+'px',height:height+'px'});
    };
    infograme.editor.LinkedArea.prototype.updateArea = function() {
        var position = jQuery(this.element).position();
        var width = jQuery(this.element).width();
        var height = jQuery(this.element).height();

        // Remove this object if width or hight is 0
        if (width === 0 || height === 0) {
            if(window.console) console.log("Remove area because it has 0 width or height");
            this.component.removeTag(this.obj.id);
            return null;
        }
        // Otherwise, save data to the object
        else {
            this.obj.x = position.left / this.component.width;
            this.obj.y = position.top / this.component.height;
            this.obj.width = width / this.component.width;
            this.obj.height = width / this.component.height;
        }

        return this;
    };
    // Custmize default behaviour
    infograme.editor.LinkedArea.prototype.focus = function() {
        if (this.component.state.isEditing()) {
            jQuery(this.element).css({opacity:1});
        } else {
            jQuery(this.element).css({opacity:0.6});
        }
    };
    infograme.editor.LinkedArea.prototype.unfocus = function() {
        if (this.component.state.isEditing()) {
            jQuery(this.element).css({opacity:0.6});
        } else {
            jQuery(this.element).css({opacity:0});
        }
    };

    /*
    infograme.editor.AbstractPopup
    */
    infograme.editor.AbstractPopup = function(component, tag, obj) {
        this.component = component;
        this.tag = tag;
        this.obj = obj;
        this.isEditing = false;
    };
    infograme.editor.AbstractPopup.prototype.viewPopupOptions = function() {};
    infograme.editor.AbstractPopup.prototype.editPopupOptions = function() {};
    infograme.editor.AbstractPopup.prototype.makeObj = function() {};
    infograme.editor.AbstractPopup.prototype.updateObj = function(obj) {};
    infograme.editor.AbstractPopup.prototype.updateView = function() {};
    infograme.editor.AbstractPopup.removeAllPopups = function () {
        jQuery('*').RemoveBubblePopup();
    };
    infograme.editor.AbstractPopup.prototype.isOpened = function() {
        return jQuery(this.tag.element).IsBubblePopupOpen();
    };
    infograme.editor.AbstractPopup.prototype.showPopup = function() {
        if (!jQuery(this.tag.element).HasBubblePopup()) {
            jQuery(this.tag.element).CreateBubblePopup({manageMouseEvents:false});
        }
        jQuery(this.tag.element).ShowBubblePopup(this.currentOption());
        this.updateView();
        this.initInteraction();
    };
    infograme.editor.AbstractPopup.prototype.hidePopup = function() {
        jQuery(this.tag.element).HideBubblePopup();
    };
    infograme.editor.AbstractPopup.prototype.element = function() {
        return jQuery("#" + jQuery(this.tag.element).GetBubblePopupID()).get(0);
    };
    infograme.editor.AbstractPopup.prototype.innerElement = function() {
        return jQuery(this.element()).find(".jquerybubblepopup-innerHtml > div").get(0);
    };
    infograme.editor.AbstractPopup.prototype.handleAfterShown = function() {
        this.initInteraction();
    };
    infograme.editor.AbstractPopup.prototype.handleAfterHidden = function() {

    };
    infograme.editor.AbstractPopup.prototype.initInteraction = function() {
        jQuery(this.innerElement()).find(".infograme_delete_button").unbind().click(infograme.createDelegate(this, function(e) {
            this.component.state.handlePopupDeleteButtonClick(this);
        }));
        jQuery(this.innerElement()).find(".infograme_save_button").unbind().click(infograme.createDelegate(this, function(e) {
            this.component.state.handlePopupSaveButtonClick(this);
        }));
        jQuery(this.innerElement()).find(".infograme_edit_button").unbind().click(infograme.createDelegate(this, function(e) {
            this.component.updateState(new infograme.editor.EditingState(this.component));
        }));
        jQuery(this.innerElement()).find(".infograme_close_button").unbind().click(infograme.createDelegate(this, function(e) {
            this.component.state.handlePopupCloseButtonClick(this);
        }));
    };
    infograme.editor.AbstractPopup.prototype.cleanUp = function() {
        jQuery(this.tag.element).RemoveBubblePopup();
        if(window.console) console.log("Popup was removed:", this.obj.id);
    };
    infograme.editor.AbstractPopup.prototype.animateToViewState = function() {
        if (this.isOpened()) {
            var position = jQuery(this.element()).position();
            var newTop = position.top - infograme.editor.Editor.openBarH;
            jQuery(this.element()).animate({top:newTop+"px"});
        }
    };
    infograme.editor.AbstractPopup.prototype.animateToEditState = function() {
        if (this.isOpened()) {
            var position = jQuery(this.element()).position();
            var newTop = position.top + infograme.editor.Editor.openBarH;
            jQuery(this.element()).animate({top:newTop+"px"});
        }
    };
    infograme.editor.AbstractPopup.prototype.currentOption = function() {
        if (this.component.state.isEditing()) {
            return this.editPopupOptions();
        } else {
            return this.viewPopupOptions();
        }
    };

    /*
    infograme.editor.LinkTagPopup
    */
    infograme.editor.LinkTagPopup = function(component, tag, obj) {
        infograme.editor.LinkTagPopup.parent.constructor.call(this, component, tag, obj);
    };
    infograme.editor.LinkTagPopup.prototype = new infograme.editor.AbstractPopup();
    infograme.editor.LinkTagPopup.prototype.constructor = infograme.editor.LinkTagPopup;
    infograme.editor.LinkTagPopup.parent = infograme.editor.AbstractPopup.prototype;
    infograme.editor.LinkTagPopup.prototype.viewPopupOptions = function() {
        return {
            innerHtml: '<div class="infograme_view_popup text_tag_popup">' +
            '<div class="infograme_url"><a href="http://example.com" target="_blank">http://example.com</a></div>' +
            // '<a class="infograme_delete_button" href="javascript:void(0)">Delete</a>' +
            // '<a class="infograme_edit_button" href="javascript:void(0)">Edit</a>' +
            '</div>',
            width: 262,
            height: 50,
            alwaysVisible: false,
            position: 'right',
            align: 'top',
            tail: {align: 'top'},
            themePath: 'http://infogra.me/static/images/jquerybubblepopup-themes/',
            themeName: 'grey',
            manageMouseEvents: false,
            afterShown: infograme.createDelegate(this, this.handleAfterShown),
            afterHidden: infograme.createDelegate(this, this.handleAfterHidden)
        };
    };
    infograme.editor.LinkTagPopup.prototype.editPopupOptions = function() {
        return {
            innerHtml: '<div class="infograme_edit_popup text_tag_popup">' +
            '<div class="infograme_title">EDIT</div>' +
            '<div class="infograme_url_input">URL<div><input type="text" name="url" size="30" maxlength="200" /></div></div>' +
            '<a class="infograme_close_button" href="javascript:void(0)"></a>' +
            '<div class="infograme_buttons">' +
                '<a class="infograme_delete_button" href="javascript:void(0)">Delete</a>' +
                '<a class="infograme_save_button" href="javascript:void(0)">Save</a>' +
            '</div>' +
            '</div>',
            width: 262,
            height: 100,
            alwaysVisible: false,
            position: 'bottom',
            align: 'left',
            tail: {hidden: true},
            themePath: 'http://infogra.me/static/images/jquerybubblepopup-themes/',
            themeName: 'grey',
            manageMouseEvents: false,
            afterShown: infograme.createDelegate(this, this.handleAfterShown),
            afterHidden: infograme.createDelegate(this, this.handleAfterHidden)
        };
    };
    infograme.editor.LinkTagPopup.prototype.makeObj = function() {
        var obj = infograme.cloneObject(this.obj);
        obj.url = jQuery(this.innerElement()).find('.infograme_url_input input').val();
        return obj;
    };
    infograme.editor.AbstractPopup.prototype.updateObj = function(obj) {
        this.obj = obj;
        this.updateView();
    };
    infograme.editor.LinkTagPopup.prototype.updateView = function() {
        jQuery(this.innerElement()).find('.infograme_url a').html(this.obj.url).attr('href', this.obj.url);
        jQuery(this.innerElement()).find('.infograme_url_input input').val(this.obj.url);
    };

    /*
    infograme.editor.TextTagPopup
    */
    infograme.editor.TextTagPopup = function(component, tag, obj) {
        infograme.editor.TextTagPopup.parent.constructor.call(this, component, tag, obj);
    };
    infograme.editor.TextTagPopup.prototype = new infograme.editor.AbstractPopup();
    infograme.editor.TextTagPopup.prototype.constructor = infograme.editor.TextTagPopup;
    infograme.editor.TextTagPopup.parent = infograme.editor.AbstractPopup.prototype;
    infograme.editor.TextTagPopup.prototype.viewPopupOptions = function() {
        return {
            innerHtml: '<div class="infograme_view_popup text_tag_popup">' +
            '<div class="infograme_title"><a href="http://example.com" target="_blank">http://example.com</a></div>' +
            '<div class="infograme_description"></div>' +
            '<div class="infograme_url"><a href="http://example.com" target="_blank">http://example.com</a></div>' +
            // '<a class="infograme_delete_button" href="javascript:void(0)">Delete</a>' +
            // '<a class="infograme_edit_button" href="javascript:void(0)">Edit</a>' +
            '</div>',
            width: 262,
            height: 50,
            alwaysVisible: false,
            position: 'right',
            align: 'top',
            tail: {align: 'top'},
            themePath: 'http://infogra.me/static/images/jquerybubblepopup-themes/',
            themeName: 'grey',
            manageMouseEvents: false,
            fterShown: infograme.createDelegate(this, this.handleAfterShown),
            afterHidden: infograme.createDelegate(this, this.handleAfterHidden)
        };
    };
    infograme.editor.TextTagPopup.prototype.editPopupOptions = function() {
        return {
            innerHtml: '<div class="infograme_edit_popup text_tag_popup">' +
            '<div class="infograme_title">EDIT</div>' +
            '<div class="infograme_title_input">Title<input type="text" name="title" size="30" maxlength="200" /></div>' +
            '<div class="infograme_description_input">Description<textarea rows="3" /></div>' +
            '<div class="infograme_url_input">URL<div><input type="text" name="url" size="30" maxlength="200" /></div></div>' +
            '<a class="infograme_close_button" href="javascript:void(0)"></a>' +
            '<div class="infograme_buttons">' +
                '<a class="infograme_delete_button" href="javascript:void(0)">Delete</a>' +
                '<a class="infograme_save_button" href="javascript:void(0)">Save</a>' +
            '</div>' +
            '</div>',
            width: 262,
            height: 50,
            alwaysVisible: false,
            position: 'bottom',
            align: 'left',
            tail: {hidden: true},
            themePath: 'http://infogra.me/static/images/jquerybubblepopup-themes/',
            themeName: 'grey',
            manageMouseEvents: false,
            fterShown: infograme.createDelegate(this, this.handleAfterShown),
            afterHidden: infograme.createDelegate(this, this.handleAfterHidden)
        };
    };
    infograme.editor.TextTagPopup.prototype.makeObj = function() {
        var obj = infograme.cloneObject(this.obj);
        obj.title = jQuery(this.innerElement()).find('.infograme_title_input input').val();
        obj.description = jQuery(this.innerElement()).find('.infograme_description_input textarea').val();
        obj.url = jQuery(this.innerElement()).find('.infograme_url_input input').val();
        return obj;
    };
    infograme.editor.AbstractPopup.prototype.updateObj = function(obj) {
        this.obj = obj;
        this.updateView();
    };
    infograme.editor.TextTagPopup.prototype.updateView = function() {
        jQuery(this.innerElement()).find('.infograme_title a').html(this.obj.title).attr('href', this.obj.url);
        jQuery(this.innerElement()).find('.infograme_description').html(this.obj.description);
        jQuery(this.innerElement()).find('.infograme_url a').html(this.obj.url).attr('href', this.obj.url);

        jQuery(this.innerElement()).find('.infograme_title_input input').val(this.obj.title);
        jQuery(this.innerElement()).find('.infograme_description_input textarea').val(this.obj.description);
        jQuery(this.innerElement()).find('.infograme_url_input input').val(this.obj.url);
    };

    /*
    infograme.editor.LinkedAreaPopup
    */
    infograme.editor.LinkedAreaPopup = function(component, tag, obj) {
        infograme.editor.LinkedAreaPopup.parent.constructor.call(this, component, tag, obj);
    };
    infograme.editor.LinkedAreaPopup.prototype = new infograme.editor.AbstractPopup();
    infograme.editor.LinkedAreaPopup.prototype.constructor = infograme.editor.LinkedAreaPopup;
    infograme.editor.LinkedAreaPopup.parent = infograme.editor.AbstractPopup.prototype;
    infograme.editor.LinkedAreaPopup.prototype.viewPopupOptions = function() {
        return {
            innerHtml: '<div class="infograme_view_popup text_tag_popup">' +
            '<div class="infograme_url"><a href="http://example.com" target="_blank">http://example.com</a></div>' +
            // '<a class="infograme_delete_button" href="javascript:void(0)">Delete</a>' +
            // '<a class="infograme_edit_button" href="javascript:void(0)">Edit</a>' +
            '</div>',
            width: 262,
            height: 50,
            alwaysVisible: false,
            position: 'right',
            align: 'top',
            tail: {align: 'top'},
            themePath: 'http://infogra.me/static/images/jquerybubblepopup-themes/',
            themeName: 'grey',
            manageMouseEvents: false,
            afterShown: infograme.createDelegate(this, this.handleAfterShown),
            afterHidden: infograme.createDelegate(this, this.handleAfterHidden)
        };
    };
    infograme.editor.LinkedAreaPopup.prototype.editPopupOptions = function() {
        return {
            innerHtml: '<div class="infograme_edit_popup text_tag_popup">' +
            '<div class="infograme_title">EDIT</div>' +
            '<div class="infograme_url_input">URL<div><input type="text" name="url" size="30" maxlength="200" /></div></div>' +
            '<a class="infograme_close_button" href="javascript:void(0)"></a>' +
            '<div class="infograme_buttons">' +
                '<a class="infograme_delete_button" href="javascript:void(0)">Delete</a>' +
                '<a class="infograme_save_button" href="javascript:void(0)">Save</a>' +
            '</div>' +
            '</div>',
            width: 262,
            height: 50,
            alwaysVisible: false,
            position: 'bottom',
            align: 'left',
            tail: {hidden: true},
            themePath: 'http://infogra.me/static/images/jquerybubblepopup-themes/',
            themeName: 'grey',
            manageMouseEvents: false,
            afterShown: infograme.createDelegate(this, this.handleAfterShown),
            afterHidden: infograme.createDelegate(this, this.handleAfterHidden)
        };
    };
    infograme.editor.LinkedAreaPopup.prototype.makeObj = function() {
        var obj = infograme.cloneObject(this.obj);
        obj.url = jQuery(this.innerElement()).find('.infograme_url_input input').val();
        return obj;
    };
    infograme.editor.AbstractPopup.prototype.updateObj = function(obj) {
        this.obj = obj;
        this.updateView();
    };
    infograme.editor.LinkedAreaPopup.prototype.updateView = function() {
        jQuery(this.innerElement()).find('.infograme_url a').html(this.obj.url).attr('href', this.obj.url);
        jQuery(this.innerElement()).find('.infograme_url_input input').val(this.obj.url);
    };

    /*
    infograme.editor.AbstractState
    */
    infograme.editor.AbstractState = function(component) {
        this.component = component;
    };
    infograme.editor.AbstractState.prototype.isEditing = function() {};
    infograme.editor.AbstractState.prototype.startState = function() {};
    infograme.editor.AbstractState.prototype.finishState = function() {};
    infograme.editor.AbstractState.prototype.handleMouseLeave = function() {};
    infograme.editor.AbstractState.prototype.handleImageClick = function(e) {};
    infograme.editor.AbstractState.prototype.handleOverlayClick = function(e) {};
    infograme.editor.AbstractState.prototype.handleOverlayMouseDown = function(e) {};
    infograme.editor.AbstractState.prototype.handleOverlayMouseUp = function(e) {};
    infograme.editor.AbstractState.prototype.handleOverlayMouseMove = function(e) {};
    infograme.editor.AbstractState.prototype.handleOverlayMouseLeave = function(e) {};
    infograme.editor.AbstractState.prototype.handleTagClick = function(e, tag) {};
    infograme.editor.AbstractState.prototype.handleTagMouseOver = function(e, tag) {};
    infograme.editor.AbstractState.prototype.handleTagMouseOut = function(e, tag) {};
    infograme.editor.AbstractState.prototype.handleOpenedControl = function() {};
    infograme.editor.AbstractState.prototype.handleClosedControl = function() {};
    infograme.editor.AbstractState.prototype.handleControlButtonClick = function(type) {};
    infograme.editor.AbstractState.prototype.handlePopupSaveButtonClick = function(popup) {};
    infograme.editor.AbstractState.prototype.handlePopupDeleteButtonClick = function(popup) {};
    infograme.editor.AbstractState.prototype.handlePopupCloseButtonClick = function(popup) {};
    infograme.editor.AbstractState.prototype.handleBarCloseButtonClick = function() {};

    /*
    infograme.editor.NoEditingState
    */
    infograme.editor.NoEditingState = function(component) {
        infograme.editor.NoEditingState.parent.constructor.call(this, component);
    };
    infograme.editor.NoEditingState.prototype = new infograme.editor.AbstractState();
    infograme.editor.NoEditingState.prototype.constructor = infograme.editor.NoEditingState;
    infograme.editor.NoEditingState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.NoEditingState.prototype.isEditing = function() {
        return false;
    };
    infograme.editor.NoEditingState.prototype.startState = function() {
        this.component.tab.hideTab();
        // this.component.animateToViewState();
        this.component.updateCursor("infograme_none_editing");
        this.component.overlay.enableAllTags();
        this.component.overlay.removeAllPopups();
        this.component.overlay.updateEditingState(false);
        this.component.tab.closeEditControl();
    };
    infograme.editor.NoEditingState.prototype.handleTagMouseOver = function(e, tag) {
		
        this.component.overlay.showPopup(tag);
		
        // Prevent handleOverlayClick from being called
        e.stopPropagation();
    };
    infograme.editor.NoEditingState.prototype.handleTagClick = function(e, tag) {
        window.open(tag.obj.url);
    };
    // Wait 5 seconds before popup fades away
    infograme.editor.NoEditingState.prototype.handleTagMouseOut = function(e, tag) {
        this.component.overlay.hideAllPopups();
    };
    
    infograme.editor.NoEditingState.prototype.handleOverlayClick = function(e) {
        this.component.overlay.hideAllPopups();
    };
    infograme.editor.NoEditingState.prototype.handlePopupDeleteButtonClick = function(popup) {

        // Delete existing annotation
        if (popup.obj.id) {
            this.component.deleteAnnotation(popup.obj, infograme.createDelegate(this, function(data) {
                this.component.overlay.removeTag(popup.tag);
            }));
        }
    };

    /*
    infograme.editor.TabOpenState
    */
    infograme.editor.TabOpenState = function(component) {
        infograme.editor.TabOpenState.parent.constructor.call(this, component);
    };
    infograme.editor.TabOpenState.prototype = new infograme.editor.AbstractState();
    infograme.editor.TabOpenState.prototype.constructor = infograme.editor.TabOpenState;
    infograme.editor.TabOpenState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.TabOpenState.prototype.isEditing = function() {
        return false;
    };
    infograme.editor.TabOpenState.prototype.startState = function() {
        this.component.tab.showTab();
        this.component.tab.closeEditControl();
        this.component.updateCursor("infograme_none_editing");
        this.component.overlay.enableAllTags();
        this.component.overlay.removeAllPopups();
        // this.component.animateToTabOpenState();
        this.component.overlay.updateEditingState(false);
        this.component.tab.showHideTagsButton();
    };
    infograme.editor.TabOpenState.prototype.handleControlButtonClick = function(type) {
        switch (type) {
            case 'editTags':this.component.updateState(new infograme.editor.EditingState(this.component)); break;
        }
    };
    infograme.editor.TabOpenState.prototype.handleBarCloseButtonClick = function() {
        this.component.updateState(new infograme.editor.NoEditingState(this.component));
    };
    infograme.editor.TabOpenState.prototype.handleTagMouseOver = function(e, tag) {
        this.component.overlay.showPopup(tag);

        // Prevent handleOverlayClick from being called
        e.stopPropagation();
    };
    infograme.editor.TabOpenState.prototype.handleTagClick = function(e, tag) {
        window.open(tag.obj.url);
    };
    infograme.editor.TabOpenState.prototype.handleTagMouseOut = function(e, tag) {
        var wait = this;
        setTimeout(function(){wait.component.overlay.hideAllPopups();},5000);
    };
    infograme.editor.TabOpenState.prototype.handleOverlayClick = function(e) {
        this.component.overlay.hideAllPopups();
    };

    /*
    infograme.editor.EditingState
    */
    infograme.editor.EditingState = function(component) {
        infograme.editor.EditingState.parent.constructor.call(this, component);
    };
    infograme.editor.EditingState.prototype = new infograme.editor.AbstractState();
    infograme.editor.EditingState.prototype.constructor = infograme.editor.EditingState;
    infograme.editor.EditingState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.EditingState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.EditingState.prototype.startState = function() {
        this.component.animateToEditState();
        this.component.updateCursor("infograme_none_editing");
        this.component.overlay.enableAllTags();
        this.component.overlay.removeAllPopups();
        this.component.overlay.updateEditingState(true);
        this.component.tab.openEditControl();
        this.component.showTags();
        this.component.tab.hideHideTagsButton();
    };
    infograme.editor.EditingState.prototype.finishState = function() {
        // this.component.overlay.hideAllPopups();
    };
    infograme.editor.EditingState.prototype.handleTagClick = function(e, tag) {
        this.component.overlay.showPopup(tag);
        this.component.updateState(new infograme.editor.PopupEditingState(this.component, tag));

        // Prevent handleOverlayClick from being called
        e.stopPropagation();
    };
    infograme.editor.EditingState.prototype.handleOverlayClick = function(e) {
        this.component.overlay.hideAllPopups();
    };
    infograme.editor.EditingState.prototype.handleOpenedControl = function() {
        //TODO: reopened opened poppup
    };
    infograme.editor.EditingState.prototype.handleControlButtonClick = function(type) {
        switch (type) {
            case 'editTags':this.component.updateState(new infograme.editor.TabOpenState(this.component)); break;
            case 'link':this.component.updateState(new infograme.editor.AddingLinkState(this.component)); break;
            case 'text':this.component.updateState(new infograme.editor.AddingTextState(this.component)); break;
            case 'area':this.component.updateState(new infograme.editor.AddingAreaState(this.component)); break;
        }
    };
    infograme.editor.EditingState.prototype.handleBarCloseButtonClick = function() {
        this.component.updateState(new infograme.editor.NoEditingState(this.component));
    };

    /*
    infograme.editor.AddingLinkState
    */
    infograme.editor.AddingLinkState = function(component) {
        infograme.editor.AddingLinkState.parent.constructor.call(this, component);
    };
    infograme.editor.AddingLinkState.prototype = new infograme.editor.AbstractState();
    infograme.editor.AddingLinkState.prototype.constructor = infograme.editor.AddingLinkState;
    infograme.editor.AddingLinkState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.AddingLinkState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.AddingLinkState.prototype.startState = function() {
        this.component.updateCursor("infograme_adding_link");
        this.component.overlay.disableAllTags();
        this.component.overlay.hideAllPopups();
    };
    infograme.editor.AddingLinkState.prototype.handleMouseLeave = function() {
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };
    infograme.editor.AddingLinkState.prototype.handleOverlayClick = function(e) {
        var tag = this.component.addNewLink(infograme.grabPosition(e));
        if (tag) {
            this.component.overlay.showPopup(tag);
        }
        this.component.updateState(new infograme.editor.PopupEditingState(this.component, tag));
    };

    /*
    infograme.editor.AddingTextState
    */
    infograme.editor.AddingTextState = function(component) {
        infograme.editor.AddingTextState.parent.constructor.call(this, component);
    };
    infograme.editor.AddingTextState.prototype = new infograme.editor.AbstractState();
    infograme.editor.AddingTextState.prototype.constructor = infograme.editor.AddingTextState;
    infograme.editor.AddingTextState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.AddingTextState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.AddingTextState.prototype.startState = function() {
        this.component.updateCursor("infograme_adding_text");
        this.component.overlay.disableAllTags();
        this.component.overlay.hideAllPopups();
    };
    infograme.editor.AddingTextState.prototype.handleMouseLeave = function() {
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };
    infograme.editor.AddingTextState.prototype.handleOverlayClick = function(e) {
        var tag = this.component.addNewText(infograme.grabPosition(e));
        if (tag) {
            this.component.overlay.showPopup(tag);
        }
        this.component.updateState(new infograme.editor.PopupEditingState(this.component, tag));
    };

    /*
    infograme.editor.AddingAreaState
    */
    infograme.editor.AddingAreaState = function(component) {
        infograme.editor.AddingAreaState.parent.constructor.call(this, component);
    };
    infograme.editor.AddingAreaState.prototype = new infograme.editor.AbstractState();
    infograme.editor.AddingAreaState.prototype.constructor = infograme.editor.AddingAreaState;
    infograme.editor.AddingAreaState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.AddingAreaState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.AddingAreaState.prototype.startState = function() {
        this.component.updateCursor("infograme_adding_area");
        this.component.overlay.disableAllTags();
        this.component.overlay.hideAllPopups();
    };
    infograme.editor.AddingAreaState.prototype.handleMouseLeave = function() {
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };
    infograme.editor.AddingAreaState.prototype.handleOverlayMouseDown = function(e) {
        var area = this.component.addNewArea(infograme.grabPosition(e));
        area.disableTag();
        area.updateEditingState(true);
        this.component.updateState(new infograme.editor.DraggingAreaState(this.component, area));
    };

    /*
    infograme.editor.DraggingAreaState
    */
    infograme.editor.DraggingAreaState = function(component, area) {
        infograme.editor.DraggingAreaState.parent.constructor.call(this, component);
        this.area = area;
    };
    infograme.editor.DraggingAreaState.prototype = new infograme.editor.AbstractState();
    infograme.editor.DraggingAreaState.prototype.constructor = infograme.editor.DraggingAreaState;
    infograme.editor.DraggingAreaState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.DraggingAreaState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.DraggingAreaState.prototype.startState = function() {
        this.component.updateCursor("infograme_dragging_area");
    };
    infograme.editor.DraggingAreaState.prototype.handleMouseLeave = function() {
        this.component.removeTag(this.area.obj.id);
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };
    infograme.editor.DraggingAreaState.prototype.handleOverlayMouseLeave = function(e) {
        this.component.removeTag(this.area.obj.id);
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };
    infograme.editor.DraggingAreaState.prototype.handleOverlayMouseMove = function(e) {
        this.area.resizeArea(infograme.grabPosition(e));
    };
    infograme.editor.DraggingAreaState.prototype.handleOverlayClick = function(e) {
        this.area.resizeArea(infograme.grabPosition(e));
        var area = this.area.updateArea();
        if (area) {
            this.component.overlay.showPopup(this.area);
        }
        this.component.updateState(new infograme.editor.PopupEditingState(this.component, area));
    };

    /*
    infograme.editor.PostingState
    */
    infograme.editor.PostingState = function(component) {
        infograme.editor.PostingState.parent.constructor.call(this, component);
    };
    infograme.editor.PostingState.prototype = new infograme.editor.AbstractState();
    infograme.editor.PostingState.prototype.constructor = infograme.editor.PostingState;
    infograme.editor.PostingState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.PostingState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.PostingState.prototype.startState = function() {
        this.component.disableInteraction();
    };
    infograme.editor.PostingState.prototype.finishState = function() {
        this.component.enableInteraction();
    };

    /*
    infograme.editor.PopupEditingState
    */
    infograme.editor.PopupEditingState = function(component, tag) {
        infograme.editor.PopupEditingState.parent.constructor.call(this, component);
        this.tag = tag;
    };
    infograme.editor.PopupEditingState.prototype = new infograme.editor.AbstractState();
    infograme.editor.PopupEditingState.prototype.constructor = infograme.editor.PopupEditingState;
    infograme.editor.PopupEditingState.parent = infograme.editor.AbstractState.prototype;
    infograme.editor.PopupEditingState.prototype.isEditing = function() {
        return true;
    };
    infograme.editor.PopupEditingState.prototype.startState = function() {
        this.component.updateCursor("infograme_none_editing");
    };
    infograme.editor.PopupEditingState.prototype.finishState = function() {
    };
    infograme.editor.PopupEditingState.prototype.handlePopupSaveButtonClick = function(popup) {

        var obj = popup.makeObj();

        // Edit existing annotation
        if (obj.id) {
            this.component.modifyAnnotation(obj, infograme.createDelegate(this, function(data) {
                popup.tag.updateObj(data.annotation);
            }));
        }
        // Add new annotation
        else {
            this.component.addAnnotation(obj, infograme.createDelegate(this, function(data) {
                popup.tag.updateObj(data.annotation);
            }));
        }
    };
    infograme.editor.PopupEditingState.prototype.handlePopupDeleteButtonClick = function(popup) {

        // Delete existing annotation
        if (popup.obj.id) {
            this.component.deleteAnnotation(popup.obj, infograme.createDelegate(this, function(data) {
                this.component.overlay.removeTag(popup.tag);
            }));
        }
        // Delete new annotation
        else {
            this.component.overlay.removeTag(popup.tag);
            this.component.updateState(new infograme.editor.EditingState(this.component));
        }
    };
    infograme.editor.PopupEditingState.prototype.handleOverlayClick = function(e) {
        this.component.overlay.removeAllPopups();
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };
    infograme.editor.PopupEditingState.prototype.handlePopupCloseButtonClick = function(popup) {
        this.component.overlay.removeAllPopups();
        this.component.updateState(new infograme.editor.EditingState(this.component));
    };

    infograme.editor.loadPlugins = function() {
        if(window.console) console.log("Load plugins");
        jQuery.migrateMute===void 0&&(jQuery.migrateMute=!0),function(e,t,n){function r(n){o[n]||(o[n]=!0,e.migrateWarnings.push(n),t.console&&console.warn&&!e.migrateMute&&(console.warn("JQMIGRATE: "+n),e.migrateTrace&&console.trace&&console.trace()))}function a(t,a,o,i){if(Object.defineProperty)try{return Object.defineProperty(t,a,{configurable:!0,enumerable:!0,get:function(){return r(i),o},set:function(e){r(i),o=e}}),n}catch(s){}e._definePropertyBroken=!0,t[a]=o}var o={};e.migrateWarnings=[],!e.migrateMute&&t.console&&console.log&&console.log("JQMIGRATE: Logging is active"),e.migrateTrace===n&&(e.migrateTrace=!0),e.migrateReset=function(){o={},e.migrateWarnings.length=0},"BackCompat"===document.compatMode&&r("jQuery is not compatible with Quirks Mode");var i=e("<input/>",{size:1}).attr("size")&&e.attrFn,s=e.attr,u=e.attrHooks.value&&e.attrHooks.value.get||function(){return null},c=e.attrHooks.value&&e.attrHooks.value.set||function(){return n},l=/^(?:input|button)jQuery/i,d=/^[238]jQuery/,p=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)jQuery/i,f=/^(?:checked|selected)jQuery/i;a(e,"attrFn",i||{},"jQuery.attrFn is deprecated"),e.attr=function(t,a,o,u){var c=a.toLowerCase(),g=t&&t.nodeType;return u&&(4>s.length&&r("jQuery.fn.attr( props, pass ) is deprecated"),t&&!d.test(g)&&(i?a in i:e.isFunction(e.fn[a])))?e(t)[a](o):("type"===a&&o!==n&&l.test(t.nodeName)&&t.parentNode&&r("Can't change the 'type' of an input or button in IE 6/7/8"),!e.attrHooks[c]&&p.test(c)&&(e.attrHooks[c]={get:function(t,r){var a,o=e.prop(t,r);return o===!0||"boolean"!=typeof o&&(a=t.getAttributeNode(r))&&a.nodeValue!==!1?r.toLowerCase():n},set:function(t,n,r){var a;return n===!1?e.removeAttr(t,r):(a=e.propFix[r]||r,a in t&&(t[a]=!0),t.setAttribute(r,r.toLowerCase())),r}},f.test(c)&&r("jQuery.fn.attr('"+c+"') may use property instead of attribute")),s.call(e,t,a,o))},e.attrHooks.value={get:function(e,t){var n=(e.nodeName||"").toLowerCase();return"button"===n?u.apply(this,arguments):("input"!==n&&"option"!==n&&r("jQuery.fn.attr('value') no longer gets properties"),t in e?e.value:null)},set:function(e,t){var a=(e.nodeName||"").toLowerCase();return"button"===a?c.apply(this,arguments):("input"!==a&&"option"!==a&&r("jQuery.fn.attr('value', val) no longer sets properties"),e.value=t,n)}};var g,h,v=e.fn.init,m=e.parseJSON,y=/^(?:[^<]*(<[\w\W]+>)[^>]*|#([\w\-]*))jQuery/;e.fn.init=function(t,n,a){var o;return t&&"string"==typeof t&&!e.isPlainObject(n)&&(o=y.exec(t))&&o[1]&&("<"!==t.charAt(0)&&r("jQuery(html) HTML strings must start with '<' character"),n&&n.context&&(n=n.context),e.parseHTML)?v.call(this,e.parseHTML(e.trim(t),n,!0),n,a):v.apply(this,arguments)},e.fn.init.prototype=e.fn,e.parseJSON=function(e){return e||null===e?m.apply(this,arguments):(r("jQuery.parseJSON requires a valid JSON string"),null)},e.uaMatch=function(e){e=e.toLowerCase();var t=/(chrome)[ \/]([\w.]+)/.exec(e)||/(webkit)[ \/]([\w.]+)/.exec(e)||/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(e)||/(msie) ([\w.]+)/.exec(e)||0>e.indexOf("compatible")&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(e)||[];return{browser:t[1]||"",version:t[2]||"0"}},e.browser||(g=e.uaMatch(navigator.userAgent),h={},g.browser&&(h[g.browser]=!0,h.version=g.version),h.chrome?h.webkit=!0:h.webkit&&(h.safari=!0),e.browser=h),a(e,"browser",e.browser,"jQuery.browser is deprecated"),e.sub=function(){function t(e,n){return new t.fn.init(e,n)}e.extend(!0,t,this),t.superclass=this,t.fn=t.prototype=this(),t.fn.constructor=t,t.sub=this.sub,t.fn.init=function(r,a){return a&&a instanceof e&&!(a instanceof t)&&(a=t(a)),e.fn.init.call(this,r,a,n)},t.fn.init.prototype=t.fn;var n=t(document);return r("jQuery.sub() is deprecated"),t},e.ajaxSetup({converters:{"text json":e.parseJSON}});var b=e.fn.data;e.fn.data=function(t){var a,o,i=this[0];return!i||"events"!==t||1!==arguments.length||(a=e.data(i,t),o=e._data(i,t),a!==n&&a!==o||o===n)?b.apply(this,arguments):(r("Use of jQuery.fn.data('events') is deprecated"),o)};var j=/\/(java|ecma)script/i,w=e.fn.andSelf||e.fn.addBack;e.fn.andSelf=function(){return r("jQuery.fn.andSelf() replaced by jQuery.fn.addBack()"),w.apply(this,arguments)},e.clean||(e.clean=function(t,a,o,i){a=a||document,a=!a.nodeType&&a[0]||a,a=a.ownerDocument||a,r("jQuery.clean() is deprecated");var s,u,c,l,d=[];if(e.merge(d,e.buildFragment(t,a).childNodes),o)for(c=function(e){return!e.type||j.test(e.type)?i?i.push(e.parentNode?e.parentNode.removeChild(e):e):o.appendChild(e):n},s=0;null!=(u=d[s]);s++)e.nodeName(u,"script")&&c(u)||(o.appendChild(u),u.getElementsByTagName!==n&&(l=e.grep(e.merge([],u.getElementsByTagName("script")),c),d.splice.apply(d,[s+1,0].concat(l)),s+=l.length));return d});var Q=e.event.add,x=e.event.remove,k=e.event.trigger,N=e.fn.toggle,C=e.fn.live,S=e.fn.die,T="ajaxStart|ajaxStop|ajaxSend|ajaxComplete|ajaxError|ajaxSuccess",M=RegExp("\\b(?:"+T+")\\b"),H=/(?:^|\s)hover(\.\S+|)\b/,A=function(t){return"string"!=typeof t||e.event.special.hover?t:(H.test(t)&&r("'hover' pseudo-event is deprecated, use 'mouseenter mouseleave'"),t&&t.replace(H,"mouseenterjQuery1 mouseleavejQuery1"))};e.event.props&&"attrChange"!==e.event.props[0]&&e.event.props.unshift("attrChange","attrName","relatedNode","srcElement"),e.event.dispatch&&a(e.event,"handle",e.event.dispatch,"jQuery.event.handle is undocumented and deprecated"),e.event.add=function(e,t,n,a,o){e!==document&&M.test(t)&&r("AJAX events should be attached to document: "+t),Q.call(this,e,A(t||""),n,a,o)},e.event.remove=function(e,t,n,r,a){x.call(this,e,A(t)||"",n,r,a)},e.fn.error=function(){var e=Array.prototype.slice.call(arguments,0);return r("jQuery.fn.error() is deprecated"),e.splice(0,0,"error"),arguments.length?this.bind.apply(this,e):(this.triggerHandler.apply(this,e),this)},e.fn.toggle=function(t,n){if(!e.isFunction(t)||!e.isFunction(n))return N.apply(this,arguments);r("jQuery.fn.toggle(handler, handler...) is deprecated");var a=arguments,o=t.guid||e.guid++,i=0,s=function(n){var r=(e._data(this,"lastToggle"+t.guid)||0)%i;return e._data(this,"lastToggle"+t.guid,r+1),n.preventDefault(),a[r].apply(this,arguments)||!1};for(s.guid=o;a.length>i;)a[i++].guid=o;return this.click(s)},e.fn.live=function(t,n,a){return r("jQuery.fn.live() is deprecated"),C?C.apply(this,arguments):(e(this.context).on(t,this.selector,n,a),this)},e.fn.die=function(t,n){return r("jQuery.fn.die() is deprecated"),S?S.apply(this,arguments):(e(this.context).off(t,this.selector||"**",n),this)},e.event.trigger=function(e,t,n,a){return n||M.test(e)||r("Global events are undocumented and deprecated"),k.call(this,e,t,n||document,a)},e.each(T.split("|"),function(t,n){e.event.special[n]={setup:function(){var t=this;return t!==document&&(e.event.add(document,n+"."+e.guid,function(){e.event.trigger(n,null,t,!0)}),e._data(this,n,e.guid++)),!1},teardown:function(){return this!==document&&e.event.remove(document,n+"."+e._data(this,n)),!1}}})}(jQuery,window);
        eval(function(p,a,c,k,e,r){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--)r[e(c)]=k[c]||e(c);k=[function(e){return r[e]}];e=function(){return'\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p}('(6(a){a.1i.3t=6(){4 c=X;a(W).1e(6(d,e){4 b=a(e).1I("1R");5(b!=X&&7 b=="1a"&&!a.18(b)&&!a.19(b)&&b.3!=X&&7 b.3=="1a"&&!a.18(b.3)&&!a.19(b.3)&&7 b.3.1t!="1u"){c=b.3.1t?U:Q}12 Q});12 c};a.1i.3u=6(){4 b=X;a(W).1e(6(e,f){4 d=a(f).1I("1R");5(d!=X&&7 d=="1a"&&!a.18(d)&&!a.19(d)&&d.3!=X&&7 d.3=="1a"&&!a.18(d.3)&&!a.19(d.3)&&7 d.3.1S!="1u"&&d.3.1S!=X){b=c(d.3.1S)}12 Q});6 c(d){12 2s 2J(d*2K)}12 b};a.1i.3v=6(){4 b=X;a(W).1e(6(e,f){4 d=a(f).1I("1R");5(d!=X&&7 d=="1a"&&!a.18(d)&&!a.19(d)&&d.3!=X&&7 d.3=="1a"&&!a.18(d.3)&&!a.19(d.3)&&7 d.3.1V!="1u"&&d.3.1V!=X){b=c(d.3.1V)}12 Q});6 c(d){12 2s 2J(d*2K)}12 b};a.1i.3w=6(){4 b=X;a(W).1e(6(e,f){4 d=a(f).1I("1R");5(d!=X&&7 d=="1a"&&!a.18(d)&&!a.19(d)&&d.3!=X&&7 d.3=="1a"&&!a.18(d.3)&&!a.19(d.3)&&7 d.3.1J!="1u"&&d.3.1J!=X){b=c(d.3.1J)}12 Q});6 c(d){12 2s 2J(d*2K)}12 b};a.1i.3x=6(){4 b=X;a(W).1e(6(d,e){4 c=a(e).1I("1R");5(c!=X&&7 c=="1a"&&!a.18(c)&&!a.19(c)&&c.3!=X&&7 c.3=="1a"&&!a.18(c.3)&&!a.19(c.3)&&7 c.3.S!="1u"){b=a("#"+c.3.S).Z>0?a("#"+c.3.S).2k():X}12 Q});12 b};a.1i.3y=6(){4 b=X;a(W).1e(6(d,e){4 c=a(e).1I("1R");5(c!=X&&7 c=="1a"&&!a.18(c)&&!a.19(c)&&c.3!=X&&7 c.3=="1a"&&!a.18(c.3)&&!a.19(c.3)&&7 c.3.S!="1u"){b=c.3.S}12 Q});12 b};a.1i.3z=6(){4 b=0;a(W).1e(6(d,e){4 c=a(e).1I("1R");5(c!=X&&7 c=="1a"&&!a.18(c)&&!a.19(c)&&c.3!=X&&7 c.3=="1a"&&!a.18(c.3)&&!a.19(c.3)&&7 c.3.S!="1u"){a(e).2d("2S");a(e).2d("2T");a(e).2d("2U");a(e).2d("2A");a(e).2d("2L");a(e).2d("2t");a(e).2d("2u");a(e).2d("22");a(e).1I("1R",{});5(a("#"+c.3.S).Z>0){a("#"+c.3.S).2B()}b++}});12 b};a.1i.3A=6(){4 c=Q;a(W).1e(6(d,e){4 b=a(e).1I("1R");5(b!=X&&7 b=="1a"&&!a.18(b)&&!a.19(b)&&b.3!=X&&7 b.3=="1a"&&!a.18(b.3)&&!a.19(b.3)&&7 b.3.S!="1u"){c=U}12 Q});12 c};a.1i.3B=6(){4 b={};a(W).1e(6(c,d){b=a(d).1I("1R");5(b!=X&&7 b=="1a"&&!a.18(b)&&!a.19(b)&&b.3!=X&&7 b.3=="1a"&&!a.18(b.3)&&!a.19(b.3)){3C b.3}1c{b=X}12 Q});5(a.19(b)){b=X}12 b};a.1i.3D=6(b,c){a(W).1e(6(d,e){5(7 c!="1K"){c=U}a(e).1f("2T",[b,c])})};a.1i.3E=6(b){a(W).1e(6(c,d){a(d).1f("2U",[b])})};a.1i.3F=6(b,c){a(W).1e(6(d,e){a(e).1f("2u",[b,c,U]);12 Q})};a.1i.3G=6(b,c){a(W).1e(6(d,e){a(e).1f("2u",[b,c,U])})};a.1i.3H=6(){a(W).1e(6(b,c){a(c).1f("22",[U]);12 Q})};a.1i.3I=6(){a(W).1e(6(b,c){a(c).1f("22",[U])})};a.1i.3J=6(){a(W).1e(6(b,c){a(c).1f("2L");12 Q})};a.1i.3K=6(){a(W).1e(6(b,c){a(c).1f("2L")})};a.1i.3L=6(){a(W).1e(6(b,c){a(c).1f("2t");12 Q})};a.1i.3M=6(){a(W).1e(6(b,c){a(c).1f("2t")})};a.1i.3N=6(e){4 r={2M:W,3O:[],2V:"1R",3a:["T","13","1b"],3b:["R","13","1d"],3c:\'<3d 1v="{1L} {3e}"{2W} S="{2X}">                                     <2Y{2Z}>                                    <3f>                                    <2v>                                        <14 1v="{1L}-T-R"{2l-30}>{2l-2N}</14>                                       <14 1v="{1L}-T-13"{2l-3g}>{2l-1W}</14>                                      <14 1v="{1L}-T-1d"{2l-31}>{2l-2O}</14>                                  </2v>                                   <2v>                                        <14 1v="{1L}-13-R"{1W-30}>{1W-2N}</14>                                      <14 1v="{1L}-1G"{32}>{33}</14>                                      <14 1v="{1L}-13-1d"{1W-31}>{1W-2O}</14>                                     </2v>                                   <2v>                                        <14 1v="{1L}-1b-R"{2m-30}>{2m-2N}</14>                                      <14 1v="{1L}-1b-13"{2m-3g}>{2m-1W}</14>                                         <14 1v="{1L}-1b-1d"{2m-31}>{2m-2O}</14>                                     </2v>                                   </3f>                                   </2Y>                                   </3d>\',3:{S:X,1J:X,1V:X,1S:X,1t:Q,1M:Q,1o:Q,1z:Q,1X:Q,1A:Q,23:{}},15:"T",3h:["R","T","1d","1b"],11:"24",34:["R","24","1d","T","13","1b"],2P:["R","24","1d"],35:["T","13","1b"],1n:"3P",1p:X,1q:X,1w:{},1x:{},1G:X,1N:{},V:{11:"24",1C:Q},1j:U,2n:U,25:Q,2o:U,26:"2C",3i:["2C","36"],27:"36",3j:["2C","36"],1O:3k,1P:3k,28:0,29:0,Y:"3l",1Y:"3Q",2a:"3l-3R/",1h:{2D:"3S",1D:"3T"},1T:6(){},1U:6(){},1m:[]};h(e);6 g(v){4 w={3:{},1p:r.1p,1q:r.1q,1w:r.1w,1x:r.1x,15:r.15,11:r.11,1n:r.1n,1O:r.1O,1P:r.1P,28:r.28,29:r.29,26:r.26,27:r.27,V:r.V,1G:r.1G,1N:r.1N,Y:r.Y,1Y:r.1Y,2a:r.2a,1h:r.1h,1j:r.1j,2o:r.2o,2n:r.2n,25:r.25,1T:r.1T,1U:r.1U,1m:r.1m};4 t=a.3U(Q,w,(7 v=="1a"&&!a.18(v)&&!a.19(v)&&v!=X?v:{}));t.3.S=r.3.S;t.3.1J=r.3.1J;t.3.1V=r.3.1V;t.3.1S=r.3.1S;t.3.1t=r.3.1t;t.3.1M=r.3.1M;t.3.1o=r.3.1o;t.3.1z=r.3.1z;t.3.1X=r.3.1X;t.3.1A=r.3.1A;t.3.23=r.3.23;t.1p=(7 t.1p=="1Q"||7 t.1p=="2b")&&10(t.1p)>0?10(t.1p):r.1p;t.1q=(7 t.1q=="1Q"||7 t.1q=="2b")&&10(t.1q)>0?10(t.1q):r.1q;t.1w=t.1w!=X&&7 t.1w=="1a"&&!a.18(t.1w)&&!a.19(t.1w)?t.1w:r.1w;t.1x=t.1x!=X&&7 t.1x=="1a"&&!a.18(t.1x)&&!a.19(t.1x)?t.1x:r.1x;t.15=7 t.15=="1Q"&&o(t.15.1Z(),r.3h)?t.15.1Z():r.15;t.11=7 t.11=="1Q"&&o(t.11.1Z(),r.34)?t.11.1Z():r.11;t.1n=(7 t.1n=="1Q"||7 t.1n=="2b")&&10(t.1n)>=0?10(t.1n):r.1n;t.1O=7 t.1O=="2b"&&10(t.1O)>0?10(t.1O):r.1O;t.1P=7 t.1P=="2b"&&10(t.1P)>0?10(t.1P):r.1P;t.28=7 t.28=="2b"&&t.28>=0?t.28:r.28;t.29=7 t.29=="2b"&&t.29>=0?t.29:r.29;t.26=7 t.26=="1Q"&&o(t.26.1Z(),r.3i)?t.26.1Z():r.26;t.27=7 t.27=="1Q"&&o(t.27.1Z(),r.3j)?t.27.1Z():r.27;t.V=t.V!=X&&7 t.V=="1a"&&!a.18(t.V)&&!a.19(t.V)?t.V:r.V;t.V.11=7 t.V.11!="1u"?t.V.11:r.V.11;t.V.1C=7 t.V.1C!="1u"?t.V.1C:r.V.1C;t.1G=7 t.1G=="1Q"&&t.1G.Z>0?t.1G:r.1G;t.1N=t.1N!=X&&7 t.1N=="1a"&&!a.18(t.1N)&&!a.19(t.1N)?t.1N:r.1N;t.Y=j(7 t.Y=="1Q"&&t.Y.Z>0?t.Y:r.Y);t.1Y=7 t.1Y=="1Q"&&t.1Y.Z>0?a.3m(t.1Y):r.1Y;t.2a=7 t.2a=="1Q"&&t.2a.Z>0?a.3m(t.2a):r.2a;t.1h=t.1h!=X&&7 t.1h=="1a"&&!a.18(t.1h)&&!a.19(t.1h)&&(7 10(t.1h.2D)=="2b"&&7 10(t.1h.1D)=="2b")?t.1h:r.1h;t.1j=7 t.1j=="1K"&&t.1j==U?U:Q;t.2o=7 t.2o=="1K"&&t.2o==U?U:Q;t.2n=7 t.2n=="1K"&&t.2n==U?U:Q;t.25=7 t.25=="1K"&&t.25==U?U:Q;t.1T=7 t.1T=="6"?t.1T:r.1T;t.1U=7 t.1U=="6"?t.1U:r.1U;t.1m=a.18(t.1m)?t.1m:r.1m;5(t.15=="R"||t.15=="1d"){t.11=o(t.11,r.35)?t.11:"13"}1c{t.11=o(t.11,r.2P)?t.11:"24"}20(4 u 2p t.V){2e(u){17"11":t.V.11=7 t.V.11=="1Q"&&o(t.V.11.1Z(),r.34)?t.V.11.1Z():r.V.11;5(t.15=="R"||t.15=="1d"){t.V.11=o(t.V.11,r.35)?t.V.11:"13"}1c{t.V.11=o(t.V.11,r.2P)?t.V.11:"24"}16;17"1C":t.V.1C=t.V.1C==U?U:Q;16}}12 t}6 l(t){5(t==0){12 0}5(t>0){12-(1r.1y(t))}1c{12 1r.1y(t)}}6 o(v,w){4 t=Q;20(4 u 2p w){5(w[u]==v){t=U;16}}12 t}6 k(t){a(t).1e(6(){a("<1H/>")[0].2q=W})}6 b(t){5(t.1m&&t.1m.Z>0){20(4 u=0;u<t.1m.Z;u++){4 v=(t.1m[u].3n(0)!="#"?"#"+t.1m[u]:t.1m[u]);a(v).1k({37:"1C"})}}}6 s(u){5(u.1m&&u.1m.Z>0){20(4 v=0;v<u.1m.Z;v++){4 x=(u.1m[v].3n(0)!="#"?"#"+u.1m[v]:u.1m[v]);a(x).1k({37:"3o"});4 w=a(x).Z;20(4 t=0;t<w.Z;t++){a(w[t]).1k({37:"3o"})}}}}6 m(u){4 w=u.2a;4 t=u.1Y;4 v=(w.2E(w.Z-1)=="/"||w.2E(w.Z-1)=="\\\\")?w.2E(0,w.Z-1)+"/"+t+"/":w+"/"+t+"/";12 v+(u.1j==U?(a.1l.1E?"2f/":""):"2f/")}6 j(t){4 u=t.2E(0,1)=="."?t.2E(1,t.Z):t;12 u}6 q(u){5(a("#"+u.3.S).Z>0){4 t="1b-13";2e(u.15){17"R":t="13-1d";16;17"T":t="1b-13";16;17"1d":t="13-R";16;17"1b":t="T-13";16}5(o(u.V.11,r.2P)){a("#"+u.3.S).1g("14."+u.Y+"-"+t).1k("38-11",u.V.11)}1c{a("#"+u.3.S).1g("14."+u.Y+"-"+t).1k("39-11",u.V.11)}}}6 p(v){4 H=r.3c;4 F=m(v);4 x="";4 G="";4 u="";5(!v.V.1C){2e(v.15){17"R":G="1d";u="{1W-2O}";16;17"T":G="1b";u="{2m-1W}";16;17"1d":G="R";u="{1W-2N}";16;17"1b":G="T";u="{2l-1W}";16}x=\'<1H 2q="\'+F+"V-"+G+"."+(v.1j==U?(a.1l.1E?"1F":"2r"):"1F")+\'" 2w="" 1v="\'+v.Y+\'-V" />\'}4 t=r.3a;4 z=r.3b;4 K,E,A,J;4 B="";4 y="";4 D=2s 3p();20(E 2p t){A="";J="";20(K 2p z){A=t[E]+"-"+z[K];A=A.3V();J="{"+A+"3W}";A="{"+A+"}";5(A==u){H=H.1B(A,x);B=""}1c{H=H.1B(A,"");B=""}5(t[E]+"-"+z[K]!="13-13"){y=F+t[E]+"-"+z[K]+"."+(v.1j==U?(a.1l.1E?"1F":"2r"):"1F");D.3X(y);H=H.1B(J,\' 2Q="\'+B+"3Y-3Z:40("+y+\');"\')}}}5(D.Z>0){k(D)}4 w="";5(v.1x!=X&&7 v.1x=="1a"&&!a.18(v.1x)&&!a.19(v.1x)){20(4 C 2p v.1x){w+=C+":"+v.1x[C]+";"}}w+=(v.1p!=X||v.1q!=X)?(v.1p!=X?"1p:"+v.1p+"21;":"")+(v.1q!=X?"1q:"+v.1q+"21;":""):"";H=w.Z>0?H.1B("{2Z}",\' 2Q="\'+w+\'"\'):H.1B("{2Z}","");4 I="";5(v.1w!=X&&7 v.1w=="1a"&&!a.18(v.1w)&&!a.19(v.1w)){20(4 C 2p v.1w){I+=C+":"+v.1w[C]+";"}}H=I.Z>0?H.1B("{2W}",\' 2Q="\'+I+\'"\'):H.1B("{2W}","");H=H.1B("{3e}",v.Y+"-"+v.1Y);H=v.3.S!=X?H.1B("{2X}",v.3.S):H.1B("{2X}","");41(H.42("{1L}")>-1){H=H.1B("{1L}",v.Y)}H=v.1G!=X?H.1B("{33}",v.1G):H.1B("{33}","");J="";20(4 C 2p v.1N){J+=C+":"+v.1N[C]+";"}H=J.Z>0?H.1B("{32}",\' 2Q="\'+J+\'"\'):H.1B("{32}","");12 H}6 f(){12 1r.43(2s 2J().44()/2K)}6 c(E,N,x){4 O=x.15;4 K=x.11;4 z=x.1n;4 F=x.1h;4 I=2s 3p();4 u=N.2F();4 t=10(u.T);4 y=10(u.R);4 P=10(N.2x(Q));4 L=10(N.2y(Q));4 v=10(E.2x(Q));4 M=10(E.2y(Q));F.1D=1r.1y(10(F.1D));F.2D=1r.1y(10(F.2D));4 w=l(F.1D);4 J=l(F.1D);4 A=l(F.2D);4 H=m(x);2e(K){17"R":I.T=O=="T"?t-M-z+l(w):t+L+z+w;I.R=y+A;16;17"24":4 D=1r.1y(v-P)/2;I.T=O=="T"?t-M-z+l(w):t+L+z+w;I.R=v>=P?y-D:y+D;16;17"1d":4 D=1r.1y(v-P);I.T=O=="T"?t-M-z+l(w):t+L+z+w;I.R=v>=P?y-D+l(A):y+D+l(A);16;17"T":I.T=t+A;I.R=O=="R"?y-v-z+l(J):y+P+z+J;16;17"13":4 D=1r.1y(M-L)/2;I.T=M>=L?t-D:t+D;I.R=O=="R"?y-v-z+l(J):y+P+z+J;16;17"1b":4 D=1r.1y(M-L);I.T=M>=L?t-D+l(A):t+D+l(A);I.R=O=="R"?y-v-z+l(J):y+P+z+J;16}I.15=O;5(a("#"+x.3.S).Z>0&&a("#"+x.3.S).1g("1H."+x.Y+"-V").Z>0){a("#"+x.3.S).1g("1H."+x.Y+"-V").2B();4 G="1b";4 C="1b-13";2e(O){17"R":G="1d";C="13-1d";16;17"T":G="1b";C="1b-13";16;17"1d":G="R";C="13-R";16;17"1b":G="T";C="T-13";16}a("#"+x.3.S).1g("14."+x.Y+"-"+C).2G();a("#"+x.3.S).1g("14."+x.Y+"-"+C).2k(\'<1H 2q="\'+H+"V-"+G+"."+(x.1j==U?(a.1l.1E?"1F":"2r"):"1F")+\'" 2w="" 1v="\'+x.Y+\'-V" />\');q(x)}5(x.2n==U){5(I.T<a(1s).2g()||I.T+M>a(1s).2g()+a(1s).1q()){5(a("#"+x.3.S).Z>0&&a("#"+x.3.S).1g("1H."+x.Y+"-V").Z>0){a("#"+x.3.S).1g("1H."+x.Y+"-V").2B()}4 B="";5(I.T<a(1s).2g()){I.15="1b";I.T=t+L+z+w;5(a("#"+x.3.S).Z>0&&!x.V.1C){a("#"+x.3.S).1g("14."+x.Y+"-T-13").2G();a("#"+x.3.S).1g("14."+x.Y+"-T-13").2k(\'<1H 2q="\'+H+"V-T."+(x.1j==U?(a.1l.1E?"1F":"2r"):"1F")+\'" 2w="" 1v="\'+x.Y+\'-V" />\');B="T-13"}}1c{5(I.T+M>a(1s).2g()+a(1s).1q()){I.15="T";I.T=t-M-z+l(w);5(a("#"+x.3.S).Z>0&&!x.V.1C){a("#"+x.3.S).1g("14."+x.Y+"-1b-13").2G();a("#"+x.3.S).1g("14."+x.Y+"-1b-13").2k(\'<1H 2q="\'+H+"V-1b."+(x.1j==U?(a.1l.1E?"1F":"2r"):"1F")+\'" 2w="" 1v="\'+x.Y+\'-V" />\');B="1b-13"}}}5(I.R<0){I.R=0;5(B.Z>0){a("#"+x.3.S).1g("14."+x.Y+"-"+B).1k("38-11","24")}}1c{5(I.R+v>a(1s).1p()){I.R=a(1s).1p()-v;5(B.Z>0){a("#"+x.3.S).1g("14."+x.Y+"-"+B).1k("38-11","24")}}}}1c{5(I.R<0||I.R+v>a(1s).1p()){5(a("#"+x.3.S).Z>0&&a("#"+x.3.S).1g("1H."+x.Y+"-V").Z>0){a("#"+x.3.S).1g("1H."+x.Y+"-V").2B()}4 B="";5(I.R<0){I.15="1d";I.R=y+P+z+J;5(a("#"+x.3.S).Z>0&&!x.V.1C){a("#"+x.3.S).1g("14."+x.Y+"-13-R").2G();a("#"+x.3.S).1g("14."+x.Y+"-13-R").2k(\'<1H 2q="\'+H+"V-R."+(x.1j==U?(a.1l.1E?"1F":"2r"):"1F")+\'" 2w="" 1v="\'+x.Y+\'-V" />\');B="13-R"}}1c{5(I.R+v>a(1s).1p()){I.15="R";I.R=y-v-z+l(J);5(a("#"+x.3.S).Z>0&&!x.V.1C){a("#"+x.3.S).1g("14."+x.Y+"-13-1d").2G();a("#"+x.3.S).1g("14."+x.Y+"-13-1d").2k(\'<1H 2q="\'+H+"V-1d."+(x.1j==U?(a.1l.1E?"1F":"2r"):"1F")+\'" 2w="" 1v="\'+x.Y+\'-V" />\');B="13-1d"}}}5(I.T<a(1s).2g()){I.T=a(1s).2g();5(B.Z>0){a("#"+x.3.S).1g("14."+x.Y+"-"+B).1k("39-11","13")}}1c{5(I.T+M>a(1s).2g()+a(1s).1q()){I.T=(a(1s).2g()+a(1s).1q())-M;5(B.Z>0){a("#"+x.3.S).1g("14."+x.Y+"-"+B).1k("39-11","13")}}}}}}12 I}6 d(u,t){a(u).1I(r.2V,t)}6 n(t){12 a(t).1I(r.2V)}6 i(t){4 u=t!=X&&7 t=="1a"&&!a.18(t)&&!a.19(t)?U:Q;12 u}6 h(t){a(1s).45(6(){a(r.2M).1e(6(u,v){a(v).1f("2A")})});a(46).47(6(u){a(r.2M).1e(6(v,w){a(w).1f("2S",[u.48,u.49])})});a(r.2M).1e(6(v,w){4 u=g(t);u.3.1J=f();u.3.S=u.Y+"-"+u.3.1J+"-"+v;d(w,u);a(w).2h("2S",6(y,C,B){4 N=n(W);5(i(N)&&i(N.3)&&7 C!="1u"&&7 B!="1u"){5(N.2o){4 E=a(W);4 z=E.2F();4 L=10(z.T);4 H=10(z.R);4 F=10(E.2x(Q));4 K=10(E.2y(Q));4 J=Q;5(H<=C&&C<=F+H&&L<=B&&B<=K+L){J=U}1c{J=Q}5(J&&!N.3.1X){N.3.1X=U;d(W,N);5(N.26=="2C"){a(W).1f("2u")}1c{5(N.25&&a("#"+N.3.S).Z>0){4 x=a("#"+N.3.S);4 A=x.2F();4 D=10(A.T);4 I=10(A.R);4 G=10(x.2x(Q));4 M=10(x.2y(Q));5(I<=C&&C<=G+I&&D<=B&&B<=M+D){}1c{a(W).1f("22")}}1c{a(W).1f("22")}}}1c{5(!J&&N.3.1X){N.3.1X=Q;d(W,N);5(N.27=="2C"){a(W).1f("2u")}1c{5(N.25&&a("#"+N.3.S).Z>0){4 x=a("#"+N.3.S);4 A=x.2F();4 D=10(A.T);4 I=10(A.R);4 G=10(x.2x(Q));4 M=10(x.2y(Q));5(I<=C&&C<=G+I&&D<=B&&B<=M+D){}1c{a(W).1f("22")}}1c{a(W).1f("22")}}}1c{5(!J&&!N.3.1X){5(N.25&&a("#"+N.3.S).Z>0&&!N.3.1o){4 x=a("#"+N.3.S);4 A=x.2F();4 D=10(A.T);4 I=10(A.R);4 G=10(x.2x(Q));4 M=10(x.2y(Q));5(I<=C&&C<=G+I&&D<=B&&B<=M+D){}1c{a(W).1f("22")}}}}}}}});a(w).2h("2T",6(A,x,z){4 y=n(W);5(i(y)&&i(y.3)&&7 x!="1u"){y.3.1V=f();5(7 z=="1K"&&z==U){y.1G=x}d(W,y);5(a("#"+y.3.S).Z>0){a("#"+y.3.S).1g("14."+y.Y+"-1G").2k(x);5(y.3.1z){a(W).1f("2A",[Q])}1c{a(W).1f("2A",[U])}}}});a(w).2h("2U",6(A,z){4 x=n(W);5(i(x)&&i(x.3)){4 y=x;x=g(z);x.3.S=y.3.S;x.3.1J=y.3.1J;x.3.1V=f();x.3.1S=y.3.1S;x.3.1t=y.3.1t;x.3.1M=y.3.1M;x.3.23={};d(W,x)}});a(w).2h("2A",6(A,y){4 z=n(W);5(i(z)&&i(z.3)&&a("#"+z.3.S).Z>0&&z.3.1t==U){4 x=a("#"+z.3.S);4 C=c(x,a(W),z);4 B=2;5(7 y=="1K"&&y==U){x.1k({T:C.T,R:C.R})}1c{2e(z.15){17"R":x.1k({T:C.T,R:(C.15!=z.15?C.R-(1r.1y(z.1h.1D)*B):C.R+(1r.1y(z.1h.1D)*B))});16;17"T":x.1k({T:(C.15!=z.15?C.T-(1r.1y(z.1h.1D)*B):C.T+(1r.1y(z.1h.1D)*B)),R:C.R});16;17"1d":x.1k({T:C.T,R:(C.15!=z.15?C.R+(1r.1y(z.1h.1D)*B):C.R-(1r.1y(z.1h.1D)*B))});16;17"1b":x.1k({T:(C.15!=z.15?C.T+(1r.1y(z.1h.1D)*B):C.T-(1r.1y(z.1h.1D)*B)),R:C.R});16}}}});a(w).2h("2L",6(){4 x=n(W);5(i(x)&&i(x.3)){x.3.1M=U;d(W,x)}});a(w).2h("2t",6(){4 x=n(W);5(i(x)&&i(x.3)){x.3.1M=Q;d(W,x)}});a(w).2h("2u",6(x,A,D,G){4 H=n(W);5((7 G=="1K"&&G==U&&(i(H)&&i(H.3)))||(7 G=="1u"&&(i(H)&&i(H.3)&&!H.3.1M&&!H.3.1t))){5(7 G=="1K"&&G==U){a(W).1f("2t")}H.3.1t=U;H.3.1M=Q;H.3.1o=Q;H.3.1z=Q;5(i(H.3.23)){H=H.3.23}1c{H.3.23={}}5(i(A)){4 C=H;4 F=f();H=g(A);H.3.S=C.3.S;H.3.1J=C.3.1J;H.3.1V=F;H.3.1S=F;H.3.1t=U;H.3.1M=Q;H.3.1o=Q;H.3.1z=Q;H.3.1X=C.3.1X;H.3.1A=C.3.1A;H.3.23={};5(7 D=="1K"&&D==Q){C.3.1V=F;C.3.1S=F;H.3.23=C}}d(W,H);b(H);5(a("#"+H.3.S).Z>0){a("#"+H.3.S).2B()}4 y={};4 B=p(H);y=a(B);y.4a("4b");y=a("#"+H.3.S);y.1k({2c:0,T:"3q",R:"3q",15:"4c",2H:"4d"});5(H.1j==U){5(a.1l.1E&&10(a.1l.2z)<9){a("#"+H.3.S+" 2Y").2I(H.Y+"-2f")}}q(H);4 E=c(y,a(W),H);y.1k({T:E.T,R:E.R});5(E.15==H.15){H.3.1A=Q}1c{H.3.1A=U}d(W,H);4 z=3r(6(){H.3.1o=U;d(w,H);y.3s();2e(H.15){17"R":y.2i({2c:1,R:(H.3.1A?"-=":"+=")+H.1n+"21"},H.1O,"2j",6(){H.3.1o=Q;H.3.1z=U;d(w,H);5(H.1j==U){5(a.1l.1E&&10(a.1l.2z)>8){y.2I(H.Y+"-2f")}}H.1T()});16;17"T":y.2i({2c:1,T:(H.3.1A?"-=":"+=")+H.1n+"21"},H.1O,"2j",6(){H.3.1o=Q;H.3.1z=U;d(w,H);5(H.1j==U){5(a.1l.1E&&10(a.1l.2z)>8){y.2I(H.Y+"-2f")}}H.1T()});16;17"1d":y.2i({2c:1,R:(H.3.1A?"+=":"-=")+H.1n+"21"},H.1O,"2j",6(){H.3.1o=Q;H.3.1z=U;d(w,H);5(H.1j==U){5(a.1l.1E&&10(a.1l.2z)>8){y.2I(H.Y+"-2f")}}H.1T()});16;17"1b":y.2i({2c:1,T:(H.3.1A?"+=":"-=")+H.1n+"21"},H.1O,"2j",6(){H.3.1o=Q;H.3.1z=U;d(w,H);5(H.1j==U){5(a.1l.1E&&10(a.1l.2z)>8){y.2I(H.Y+"-2f")}}H.1T()});16}},H.28)}});a(w).2h("22",6(B,x){4 A=n(W);5((7 x=="1K"&&x==U&&(i(A)&&i(A.3)&&a("#"+A.3.S).Z>0))||(7 x=="1u"&&(i(A)&&i(A.3)&&a("#"+A.3.S).Z>0&&!A.3.1M&&A.3.1t))){5(7 x=="1K"&&x==U){a(W).1f("2t")}A.3.1o=Q;A.3.1z=Q;d(W,A);4 y=a("#"+A.3.S);4 z=7 x=="1u"?A.29:0;4 C=3r(6(){A.3.1o=U;d(w,A);y.3s();5(A.1j==U){5(a.1l.1E&&10(a.1l.2z)>8){y.4e(A.Y+"-2f")}}2e(A.15){17"R":y.2i({2c:0,R:(A.3.1A?"+=":"-=")+A.1n+"21"},A.1P,"2j",6(){A.3.1t=Q;A.3.1o=Q;A.3.1z=U;d(w,A);y.1k("2H","2R");A.1U()});16;17"T":y.2i({2c:0,T:(A.3.1A?"+=":"-=")+A.1n+"21"},A.1P,"2j",6(){A.3.1t=Q;A.3.1o=Q;A.3.1z=U;d(w,A);y.1k("2H","2R");A.1U()});16;17"1d":y.2i({2c:0,R:(A.3.1A?"-=":"+=")+A.1n+"21"},A.1P,"2j",6(){A.3.1t=Q;A.3.1o=Q;A.3.1z=U;d(w,A);y.1k("2H","2R");A.1U()});16;17"1b":y.2i({2c:0,T:(A.3.1A?"-=":"+=")+A.1n+"21"},A.1P,"2j",6(){A.3.1t=Q;A.3.1o=Q;A.3.1z=U;d(w,A);y.1k("2H","2R");A.1U()});16}},z);A.3.1S=f();A.3.1M=Q;d(W,A);s(A)}})})}12 W}})(4f);',62,264,'|||privateVars|var|if|function|typeof|||||||||||||||||||||||||||||||||||||||||||||false|left|id|top|true|tail|this|null|baseClass|length|parseInt|align|return|middle|td|position|break|case|isArray|isEmptyObject|object|bottom|else|right|each|trigger|find|themeMargins|fn|dropShadow|css|browser|hideElementId|distance|is_animating|width|height|Math|window|is_open|undefined|class|divStyle|tableStyle|abs|is_animation_complete|is_position_changed|replace|hidden|difference|msie|gif|innerHtml|img|data|creation_datetime|boolean|BASE_CLASS|is_freezed|innerHtmlStyle|openingSpeed|closingSpeed|string|private_jquerybubblepopup_options|last_display_datetime|afterShown|afterHidden|last_modified_datetime|MIDDLE|is_mouse_over|themeName|toLowerCase|for|px|hidebubblepopup|last_options|center|selectable|mouseOver|mouseOut|openingDelay|closingDelay|themePath|number|opacity|unbind|switch|ie|scrollTop|bind|animate|swing|html|TOP|BOTTOM|alwaysVisible|manageMouseEvents|in|src|png|new|unfreezebubblepopup|showbubblepopup|tr|alt|outerWidth|outerHeight|version|positionbubblepopup|remove|show|total|substring|offset|empty|display|addClass|Date|1000|freezebubblepopup|me|LEFT|RIGHT|alignHorizontalValues|style|none|managebubblepopup|setbubblepopupinnerhtml|setbubblepopupoptions|options_key|DIV_STYLE|DIV_ID|table|TABLE_STYLE|LEFT_STYLE|RIGHT_STYLE|INNERHTML_STYLE|INNERHTML|alignValues|alignVerticalValues|hide|visibility|text|vertical|model_tr|model_td|model_markup|div|TEMPLATE_CLASS|tbody|MIDDLE_STYLE|positionValues|mouseOverValues|mouseOutValues|250|jquerybubblepopup|trim|charAt|visible|Array|0px|setTimeout|stop|IsBubblePopupOpen|GetBubblePopupLastDisplayDateTime|GetBubblePopupLastModifiedDateTime|GetBubblePopupCreationDateTime|GetBubblePopupMarkup|GetBubblePopupID|RemoveBubblePopup|HasBubblePopup|GetBubblePopupOptions|delete|SetBubblePopupInnerHtml|SetBubblePopupOptions|ShowBubblePopup|ShowAllBubblePopups|HideBubblePopup|HideAllBubblePopups|FreezeBubblePopup|FreezeAllBubblePopups|UnfreezeBubblePopup|UnfreezeAllBubblePopups|CreateBubblePopup|cache|20px|azure|themes|13px|10px|extend|toUpperCase|_STYLE|push|background|image|url|while|indexOf|round|getTime|resize|document|mousemove|pageX|pageY|appendTo|body|absolute|block|removeClass|jQuery'.split('|'),0,{}));
    };

    infograme.editor.start = function() {
        var infographId = jQuery(thisScriptTag).data('infograph-id');
        if(window.console) console.log("infographId", infographId);
        var elementId = "#infogra_embed_" + infographId;
        jQuery(elementId).append('<div class="infograme_editor_component"><div class="infograme_editor_component_overlay"><div class="infograme_overlay_bg"></div><div class="infograme_tags_holder"></div></div><div class="infograme_editor_component_tab"><a class="infograme_corner_button" href="javascript:void(0)"></a><div class="infograme_control_bar"><div class="infograme_control_bar_bg"></div><a class="infograme_hide_tags_button infograme_tab_button" href="javascript:void(0)">Hide Tags</a><a class="infograme_graphicsActions infograme_ga_download" href="javascript:void(0)" style="target-new: tab !important" target="_blank"></a><a class="infograme_bar_close_button" href="javascript:void(0)"></a></div></div></div>')
        var openAsEditor = false;
        var editor = new infograme.editor.Editor(jQuery('.infograme_editor_component', elementId).get(0), infographId, null, openAsEditor, jQuery);
    };
}

var scripts = document.getElementsByTagName( 'script' );
var thisScriptTag = scripts[ scripts.length - 1 ];


if(typeof jQuery === "undefined") {
    if(window.console) console.log("Load jQuery");
    var script = document.createElement("script");
    script.src = "http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js";
    document.documentElement.getElementsByTagName("HEAD")[0].appendChild(script);
    script.onload = function() {
        if(window.console) console.log("jQuery was loaded");
        infograme.editor.loadPlugins();
        infograme.editor.start();
    };
} else {
    if(window.console) console.log("jQuery exists");
    infograme.editor.loadPlugins();
    infograme.editor.start();
}


    // document.write("<script src='http://ajax.googleapis.com/ajax/libs/jquery/1.4/jquery.min.js' type='text/javascript'></script>");
    // document.write("<script type=\"text/javascript\" src=\"http://platform.twitter.com/widgets.js\"></script>");
    // document.write("<script type=\"text/javascript\" src=\"http://b.st-hatena.com/js/bookmark_button_wo_al.js\" charset=\"utf-8\" async=\"async\"></script>");

// jQuery(function() {
//     jQuery(".infogra_embed").mouseover(function(){
//         jQuery(".infogra_sns_buttons").fadeIn(190);
//         jQuery(".infogra_embed img").animate({
//             "opacity": 0.6
//         },200);
//     });
//     jQuery(".infogra_embed").mouseleave(function(){
//         jQuery(".infogra_sns_buttons").fadeOut(90);
//         jQuery(".infogra_embed img").animate({
//             "opacity": 1
//         },100);
//     });
//     var url = jQuery(".infogra_embed_ancor").attr("href");
//     var image = jQuery(".infogra_embed_image").attr("src");
//     var description = jQuery(".infogra_embed_image").attr("alt");
//     infogra_add_sns_buttons(url, image, description);
// });

// function infogra_add_sns_buttons (url, image, description) {
//     var snsButtons = '<ul class="infogra_sns_buttons"><li><a href="'+url+'" class="hatena-bookmark-button" data-hatena-bookmark-layout="vertical"><img src="http://b.st-hatena.com/images/entry-button/button-only.gif" width="20" height="20" style="border: none;" /></a></li><li><a href="https://twitter.com/share" class="twitter-share-button" data-url="'+url+'" data-text="'+description+'" data-count="vertical" lang="en">Tweet</a></li><li><iframe src="//www.facebook.com/plugins/like.php?locale=en_US&href='+url+'&amp;send=false&amp;layout=box_count&amp;width=44&amp;show_faces=true&amp;action=like&amp;colorscheme=light&amp;font&amp;height=90" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:50px; height:60px;" allowTransparency="true"></iframe></li><li><a href="http://pinterest.com/pin/create/button/?url='+url+'&media='+image+'&description='+description+'" class="pin-it-button" count-layout="vertical"><img border="0" src="//assets.pinterest.com/images/PinExt.png" title="Pin It" /></a></li></ul>';
//     jQuery(".infogra_embed").append(snsButtons);
//     jQuery("body").append("<script type=\"text/javascript\" src=\"//assets.pinterest.com/js/pinit.js\"></script>");
// }



