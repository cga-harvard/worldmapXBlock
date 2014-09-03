/* Javascript for WorldMapXBlock. */

console.log("worldmap.js loaded and executing....");

var myApp = myApp || {};

/**
 * called once for each frag on the page
 */

var CORRECT_HTML  ="<img src='/xblock/resource/worldmap/public/images/correct-icon.png'/>";
var INCORRECT_HTML="<img src='/xblock/resource/worldmap/public/images/incorrect-icon.png'/>";

myApp.WorldMapRegistry = Array();

function gettext(s) { return s;}  //TODO: replace with django's javascript i18n utilities



function WorldMapXBlock(runtime, element) {
    "use strict";
    if( $('.frame',element).attr('debug') == 'True' ) {
        $(".debugInfo",element).show();
    } else {
        $(".debugInfo",element).hide();
    }

    //****************** LAYER CONTROLS ***************************
    $('.layerControls',element).dynatree({
        title: "LayerControls",
//            minExpandLevel: 1, // 1=rootnote not collapsible
        imagePath: 'public/js/vendor/dynatree/skin/',
//            autoFocus:true,
//            keyboard: true,
//            persist: true,
//            autoCollapse: false,
//            clickFolderMode: 3, //1:activate, 2:expand, 3: activate+expand
//            activeVisible: true, // make sure, active nodes are visible (expand)
        checkbox: true,
        selectMode: 3,
//            fx: null, // or  {height: "toggle", duration:200 }
//            noLink: true,
        debugLevel: 0, // 0:quiet, 1:normal, 2:debug
        onRender: function(node, nodeSpan) {
            $(nodeSpan).find('.dynatree-icon').remove();
        },
        initAjax: {
               type: "POST",
               url: runtime.handlerUrl(element, 'layerTree'),
               data: JSON.stringify({
                   key: "root", // Optional arguments to append to the url
                   mode: "all",
                   id: $('.frame', element).attr('id')
               })
        },
        ajaxDefaults: null,
        onSelect: function(select, node) {
            node.visit( function(n) {
                if( !n.data.isFolder ) {
                    selectLayer(select, n.data.key);
                }
                return true;
            }, true);
        },
        onPostInit: function() {
            //now that the control is created, we need to update layer visibility based on state stored serverside
            //after map is loaded.
            setupWorldmap();
            setupLayerTree();
        }
    });


    myApp.WorldMapRegistry[ getUniqueId('.worldmap_block')] = { runtime: runtime, element: element };

    function setupWorldmap() {
        myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"info", function(m) { alert("info: "+m.getMessage()); });
        myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"zoomend", function(m) { on_setZoomLevel(m.getMessage()); });
        myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"moveend", function(m) { on_setCenter(m.getMessage()); });
        myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"changelayer", function(m) { on_changeLayer(m.getMessage()); });

        myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"postLegends", function(m) { postLegends(m.getMessage()); })

        myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"portalReady", function(m) {
            $.ajax({
               type: "POST",
               url:  runtime.handlerUrl(element,"getLayerStates"),
               data: "null",
               success: function(result) {
                   for (var id in result) {
                       console.log("getLayerStates says "+id+": "+JSON.stringify(result[id]));
                       selectLayer(result[id]['visibility'], id);
//                       $('.layerControls',element).dynatree("getRoot").visit( function(node) {
//                           if( node.data.key == id ) {
//                               node.select(result[id]['visibility']);
//                           }
//                       });
                   }
               }
            });
            $.ajax({
                 type: "POST",
                 url: runtime.handlerUrl(element, 'getViewInfo'),
                 data: "null",
                 success: function(result) {
                    if( result ) {
                       myApp.MESSAGING.getInstance().send(
                           getUniqueId('.worldmap_block'),
                           new myApp.Message("setCenter", {
                               zoomLevel: result.zoomLevel,
                               centerLat: result.centerLat,
                               centerLon: result.centerLon
                           })
                       );
                    }
                 }
            });

            if( $('.frame',element).attr("baseLayer") != undefined ) {
                selectLayer(true,$('.frame',element).attr("baseLayer"));
            }



            $.ajax({
                 type: "POST",
                 url: runtime.handlerUrl(element, 'getSliderSetup'),
                 data: "null",
                 success: function(result) {

                    for( var i=0; i<result.length; i++) {
                        var sliderSpec = result[i];

                        var thumb = $('<div class="slider-thumb-value" />').css({
                            top: (sliderSpec.position=="top"?-15:25),
                            left: -10
                        }).hide();



                        var title = $('<div class="slider-title"/>').text(sliderSpec.title).show();

                        var ctrl = document.createElement("div");
                        var startLabel = document.createElement("div");
                        var endLabel = document.createElement("div");
                        var sliderCtrl = document.createElement("div");

                        var orientation = (sliderSpec.position == "right" || sliderSpec.position == "left") ? "vertical" : "horizontal";

                        if( orientation == "horizontal" ) {
                            $(ctrl).addClass("horizontal-slider");
                            $(startLabel).addClass("horizontal-label").addClass("horizontal-label-left").text(sliderSpec.min).appendTo(ctrl);
                            $(sliderCtrl).addClass("horizontal-label").appendTo(ctrl);
                            $(endLabel).addClass("horizontal-label").text(sliderSpec.max).appendTo(ctrl);
                            $(title).addClass("horizontal-label-title");
                        } else {
                            $(title).addClass("vertical-label-title");
                            $(ctrl).addClass("vertical-slider-container");
                            $(endLabel).addClass("vertical-label").text(sliderSpec.max).appendTo(ctrl);
                            $(sliderCtrl).addClass("vertical-slider").appendTo(ctrl);
                            $(startLabel).addClass("vertical-label").addClass("vertical-label-bottom").text(sliderSpec.min).appendTo(ctrl);
                        }

                        if( sliderSpec.help != null) {
                            var help = $('<div class="slider-help">').html(sliderSpec.help).css({
                                position: 'relative',
                                border: '1px solid #000000',
                                backgroundColor: '#FFFFFF',
                                top: (orientation=="vertical"?0:0),
                                left: (orientation=="vertical"?0:250)
                            }).hide();
                            help.appendTo(title);
                        }

                        $(sliderCtrl).attr("id","slider-"+sliderSpec.id).slider({
                            value: sliderSpec.min,
                            min:   sliderSpec.min,
                            max:   sliderSpec.max,
                            step:  sliderSpec.increment,
                            orientation: orientation,
                            animate: "fast",
                            slide: function(e, ui) {
                                $(this).find(".ui-slider-handle .slider-thumb-value").text(ui.value);

                                var layerSpecs = myApp.worldmapLayerSpecs[getUniqueId('.worldmap_block')];
                                for (var i=0; i<layerSpecs.length; i++) {
                                    if( layerSpecs[i].params != undefined ) {
                                        for( var j=0; j<layerSpecs[i].params.length; j++) {
                                            if( layerSpecs[i].params[j].name == null ) {
                                                debug("ERROR:  unnamed param in layer specification");
                                            } else {
                                                if( sliderSpec.param == layerSpecs[i].params[j].name ) {
                                                    var paramValue = layerSpecs[i].params[j].value;
                                                    var visible =  (paramValue != null && paramValue == Math.floor(ui.value)) // * Math.pow(10,nFrac))/Math.pow(10,nFrac))
                                                        || (ui.value >= layerSpecs[i].params[j].min && ui.value <= layerSpecs[i].params[j].max);
                                                    selectLayer(visible, layerSpecs[i].id);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }).css(orientation == "vertical" ? {height:250} : {width:250})
                          .find(".ui-slider-handle")
                          .append(thumb)
                          .hover(function(e){
                                                var tip = $(e.target).find(".slider-thumb-value");
                                                if(e.type == "mouseenter") {
                                                    tip.show()
                                                } else {
                                                    tip.hide()
                                                }
                                            });

                        $(title).hover( function(e) {
                            var help = $(e.target).find(".slider-help");
                            if(e.type == "mouseenter")help.show();
                            else if(e.type == "mouseleave") help.hide();
                        });
//                        $(title).mouseenter( function(e) {
//                            $(e.target).find(".slider-help").show();
//                        });
//                        $(title).mouseleave( function(e) {
//                            $(e.target).find(".slider-help").hide();
//                        });

                        $(title).appendTo(ctrl);

                        $(ctrl).appendTo($('.sliders-'+sliderSpec.position,element));
                    }
                 }
            });

            $.ajax({
                 type: "POST",
                 url: runtime.handlerUrl(element, 'getLayerSpecs'),
                 data: "null",
                 success: function(result) {
                    if( typeof myApp.worldmapLayerSpecs == "undefined" ) myApp.worldmapLayerSpecs = [];
                    myApp.worldmapLayerSpecs[getUniqueId('.worldmap_block')] = result;
                 }
            });

            //********************** POINT & POLYGON TOOLS**************************
            $.ajax({
                 type: "POST",
                 url: runtime.handlerUrl(element, 'getQuestions'),
                 data: "null",
                 success: function(result) {
                    //window.alert(JSON.stringify(result));
                    if( result != null ) {
                        $('.prose-area',element).html(addUniqIdToArguments(getUniqueId('.worldmap_block'),result.explanation));
                        var html = "<ol class='questions-list'>";
                        for(var i in result.questions) {
                            //result.answers[i].padding = result.padding;  //TODO: should be done on xml read, not here!
                            html += "<li><span class='question-text' id='question-"+result.questions[i].id+"'><span>"+result.questions[i].explanation+"</span><br/><span class='"+result.questions[i].type+"-tool question-tool'/><span class='question-score question-text' id='score-"+result.questions[i].id+"'/><div id='dialog-"+result.questions[i].id+"'/></span></li>";
                        }
                        html += "</ol>";
                        $('.auxArea',element).html(addUniqIdToArguments(getUniqueId('.worldmap_block'), html));
                        for(var i in result.questions) {
                            var tool = $('.auxArea',element).find('#question-'+result.questions[i].id).find('.'+result.questions[i].type+'-tool');
                            tool.css('background-color','#'+result.questions[i].color);
                            tool.click( result.questions[i], function(e) {
                                myApp.MESSAGING.getInstance().sendAll( new myApp.Message("reset-answer-tool",null));
                                myApp.MESSAGING.getInstance().send(
                                    getUniqueId('.worldmap_block'),
                                    new myApp.Message("set-answer-tool", e.data)
                                );
                            });
                            var score = result.scores[result.questions[i].id];
                            if( score && score.score == 100 ) {
                                $('#score-' + result.questions[i].id).html(CORRECT_HTML);
                            } else if( score && score.score < 100) {
                                $('#score-' + result.questions[i].id).html(INCORRECT_HTML+"&nbsp;"+score.explanation);
                            }
                        }
                    }
                 },
                 failure: function(){
                     window.alert("getQuestions returned failure");
                 }
            });

            myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"point_response", responseHandler );
            myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"polygon_response", responseHandler);
            myApp.MESSAGING.getInstance().addHandler(getUniqueId('.worldmap_block'),"polyline_response", responseHandler);
        });

        //finally cause the worldmap to load
        var frm = $('.frame');
        frm.attr("src",frm.attr("worldmapUrl"));

    }

    function responseHandler(m) {
        var data = JSON.parse(JSON.parse(m.message));

        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, m.type),
            data: JSON.stringify(data),
            success: function(result) {
                if( !result ) {
                    debug("Failed to test "+ m.type+" for map: "+$('.frame', el).attr('id'));
                } else {
                    var worldmap_block = $('.worldmap_block', element);
                    var div = $('#score-'+result.question.id, worldmap_block);

                    if( result.isHit ) {
                        //   "/resource/worldmap/public/images/correct-icon.png" seems to work for workbench
                        div.html(CORRECT_HTML);
                        myApp.MESSAGING.getInstance().sendAll( new myApp.Message("reset-answer-tool",null));
                        info("Correct!", 1000,200);
                    } else {
                        div.html(INCORRECT_HTML+"&nbsp;"+result.correctExplanation);  //TODO: Fix url to point to local image
                        if( result.error != null ) {
                            error(result.error);
                        } else {
                            var nAttempt = div.attr("nAttempts");
                            if( nAttempt == undefined ) nAttempt = 0;
                            nAttempt++;
                            div.attr("nAttempts",nAttempt);
                            var hintAfterAttempt = result.question.hintAfterAttempt;
                            if( hintAfterAttempt != null ) {
                                if( nAttempt % hintAfterAttempt == 0) {
                                    var uniqId = getUniqueId('.worldmap_block');
                                    var html = "<ul>";
                                    myApp.HintManager.getInstance().reset();
                                    for( var i=0;i<result.unsatisfiedConstraints.length; i++) {
                                        var constraint = result.unsatisfiedConstraints[i];
                                        myApp.HintManager.getInstance().addConstraint(i,constraint);
                                        html += "<li>"+constraint.explanation+" (<a href='#' onclick='return myApp.HintManager.getInstance().flashHint(\""+uniqId+"\","+i+")'>hint</a>)</li>";
                                    }
                                    html += "</ul>";
                                    info(html,result.question.hintDisplayTime);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    var layerVisibilityCache = [];
    function selectLayer(select,layerid,moveTo) {
        var uniqId = getUniqueId('.worldmap_block');
        var cachedValue = layerVisibilityCache[uniqId+layerid];
        if( moveTo == undefined ) moveTo = false;
        if( typeof cachedValue == "undefined" || cachedValue != select || moveTo ) {
            var layer = {opacity:1.0, visibility:select, moveTo: moveTo};
            var layerData = JSON.stringify(JSON.parse("{\""+layerid+"\":"+JSON.stringify(layer)+"}"));

            myApp.MESSAGING.getInstance().send(
                uniqId,
                new myApp.Message('setLayers', layerData)
            )
            layerVisibilityCache[uniqId+layerid] = select;
        }
    }
    function getUniqueId(id) {
        return $(id).find('.frame').attr('id');
    }

    function on_setZoomLevel(level) {
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'set_zoom_level'),
            data: JSON.stringify({zoomLevel: level}),
            success: function(result) {
//                var id = $('.frame', el).attr('id');
//                alert("zoomlevel of "+id+" successfully changed to: "+result.zoomLevel);
            }
        });
    }
    function on_setCenter(json) {
        var data = JSON.parse(json);
        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'set_center'),
            data: JSON.stringify({centerLat: data.center.y,  centerLon: data.center.x, zoomLevel:data.zoomLevel}),
            success: function(result) {
                if( !result ) {
                    alert("Failed to setCenter for map: "+$('.frame', el).attr('id'));
                }
            }
        });
    }

    function postLegends(json) {
        var layerInfo = JSON.parse(json);
        for( var i=0; i<layerInfo.length; i++) {
            var legendData = layerInfo[i].legendData;
            if( legendData ) {
                var legendUrl = legendData.url+"?TRANSPARENT=TRUE&EXCEPTIONS=application%2Fvnd.ogc.se_xml&VERSION=1.1.1&SERVICE=WMS&REQUEST=GetLegendGraphic&TILED=true&LAYER="
                                        + legendData.name+"&STYLE="+legendData.styles+"&transparent=true&format=image%2Fpng&legend_options=fontAntiAliasing%3Atrue";
                $(".layerControls",element).dynatree("getRoot").visit( function(node) {
                    if( node.data.key === layerInfo[i].id ) {
                        node.makeVisible();
                        node.data.legendImage = $('<img class="legend-img" src="'+legendUrl+'"/>');
                        $(node.span).mousemove( function(e) {
                            var img = $(node.span).find('.legend-img');
                            if ( node.isSelected() ) {
                                if (img.length == 0) {
                                    var position = $(node.span).position();
                                    var image = node.data.legendImage.css({
                                        top: position.top,
                                        left: position.left + $(node.span).width()
                                    });
                                    image.appendTo($(node.span));
                                    img = $(node.span).find('.legend-img');
                                }
                                img.width(img[0].width).height(img[0].height).show();
                            } else if ( img.length > 0) {
                                img.hide();
                            }
                        });
                        $(node.span).mouseleave( function(e) {
                            $(node.span).find('.legend-img').hide();
                        });
                    }
                });
            }
        }
        //collapse entire tree
        $('.layerControls').dynatree("getRoot").visit(function(node) {
            if( !node.data.isFolder && node.data.children !== null ) { //found root node
                node.expand(false);
            }
        });
    }
    function on_changeLayer(json) {
        console.log("on_changeLayer("+json+") called");
        var layer = JSON.parse(json);
        $(".layerControls",element).dynatree("getRoot").visit( function(node) {
            if( node.data.key === layer.id ) {
                node.select(layer.visibility);
            }
        });

//        if( layer.visibility ) {
//            debug("layer id: "+layer.id);
//        }

        $.ajax({
            type: "POST",
            url: runtime.handlerUrl(element, 'change_layer_properties'),
            data: json,
            success: function(result) {
                if( !result ) {
                    debug("Failed to change layer for map: "+$('.frame', element).attr('id'));
                }
            }
        });

    }

    function setupLayerTree() {
        $('.layerControls').dynatree("getRoot").visit(function(node) {
            if( !node.data.isFolder && node.data.children !== null ) { //found root node
                if( node.data.isVisible !== undefined && node.data.isVisible == false ) {
                    $('.layerControls').hide();
                    return false;
                }
            }
        });
    }


    function debug(str) {
       if( $('.frame',element).attr('debug') == 'True' ) {
            var psconsole = $(".debugInfo",element);
            var text = psconsole.val() + str+"\n";
            psconsole.text(text);
            psconsole.scrollTop(
                psconsole[0].scrollHeight - psconsole.height()
            );
            if ('console' in self && 'log' in console) console.log(str);
        }
    }

    function info(msgHtml, duration, width) {
        if( duration == undefined ) duration = 5000;
        if( document.getElementById("dialog") == undefined ) {
            $("body").append($('<div/>', {id: 'dialog', class: 'ui-dialog'}));
        }
        if( width == undefined ) width=500;
        try {
            $('#dialog').prop("title",gettext("Info")).html(msgHtml).dialog({
                modal: true,
                width: width,
                closeOnEscape: true,
                title: "Info:",
                position: ['center', 'middle'],
                show: 'blind',
                hide: 'blind',
                dialogClass: 'ui-dialog-osx',
                beforeClose: function() {
                    $(".ui-widget-overlay").css("opacity","0.3");
                },
                open: function() {
                    $(".ui-widget-overlay").css("opacity","0.15");
                }
            });
            if( duration > 0 ) {
                window.setTimeout( function() {
                    $('#dialog').dialog("close");
                }, duration);
            }
        } catch (e) {
            debug("exception: "+e+"\n"+ e.stack);
        }
    }

    function error(msgHtml) {
        if( document.getElementById("dialog") == undefined ) {
            $("body").append($('<div/>', {id: 'dialog'}));
        }
        try {
        $('#dialog').html(msgHtml).dialog({
            modal: true,
            width: 400,
            title: gettext("Error!"),
            position: ['center', 'middle'],
            show: 'blind',
            hide: 'blind',
            dialogClass: 'ui-dialog-osx',
            open: function() {
                $(".ui-widget-overlay").css("opacity","0.3");
            }
        });
        } catch (e) {
            debug("exception: "+e);
        }
    }

    console.log("WorldMapXBlock initialization ended");

}

//var timeoutID = null;
//function deferredCollapseLayerTree() {
//    if( timeoutID != null ) clearTimeout(timeoutID);
//    timeoutID = setTimeout(function() {
//          $('.layerControls').dynatree("getTree").redraw();
//        $('.layerControls').dynatree("getRoot").visit(function(node) {
//            if( !node.data.isFolder && node.data.children !== null ) { //found root node
//                node.expand(false);
//                $('.layerControls').dynatree("getTree").redraw();
//            }
//        });
//    },1000);
//}

function addUniqIdToArguments( uniqId, str) {
    return str.replace(/highlight\(/g,"highlight(\""+uniqId+"\",").replace(/highlightLayer\(/g,"highlightLayer(\""+uniqId+"\",")
}

function highlight(uniqId, id, duration, relativeZoom) {
    var relZoom = relativeZoom == undefined ? 0 : relativeZoom;
    var worldmapData = myApp.WorldMapRegistry[uniqId];
    $.ajax({
        type: "POST",
        url: worldmapData.runtime.handlerUrl(worldmapData.element, 'getGeometry'),
        data: JSON.stringify(id),
        success: function(result) {
            result['relativeZoom'] = relZoom;
            result['duration'] = duration;
            myApp.MESSAGING.getInstance().send(uniqId, new myApp.Message("highlight-geometry", result));
        }
    });
    return false;
}

function highlightLayer(uniqId, layerid, duration, relativeZoom) {
    var relZoom = relativeZoom == undefined ? 0 : relativeZoom;
    myApp.MESSAGING.getInstance().send(
        uniqId,
        new myApp.Message('highlight-layer', JSON.stringify({layer: layerid, duration: duration, relativeZoom:relZoom}))
    )
    return false;
}



myApp.HintManager = (function HintManagerSingleton() { // declare 'Singleton' as the return value of a self-executing anonymous function
    var _instance = null;
    var _constructor = function() {
        this.constraints = [];
    };
    _constructor.prototype = { // *** prototypes will be "public" methods available to the instance
        reset: function() {
            this.constraints = [];
        },
        addConstraint: function(indx, constraint) {
           this.constraints[indx] = constraint;
//            debug("addConstraint["+this.constraints.length+"] = "+JSON.stringify(constraint));
        },
        flashHint: function(uniqId, indx) {
            var _this = this;
            var type = _this.constraints[indx]['geometry']['type'];
            var geo = _this.constraints[indx]['geometry']['points'];

            var worldmapData = myApp.WorldMapRegistry[uniqId];
            $.ajax({
                type: "POST",
                url: worldmapData.runtime.handlerUrl(worldmapData.element,"getFuzzyGeometry"),
                data: JSON.stringify({
                    buffer: _this.constraints[indx]['padding'],
                    type: type,
                    geometry: geo
                }),
                success: function(result) {
                    myApp.MESSAGING.getInstance().send(uniqId, new myApp.Message("flash-polygon", result));
                }
            })
            return false;
        }
    };
    return {
        // because getInstance is defined within the same scope, it can access the "private" '_instance' and '_constructor' vars
        getInstance: function() {
           if( !_instance ) {
              _instance = new _constructor();
           }
           return _instance;
        }
    }


})();
