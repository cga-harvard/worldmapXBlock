console.log("worldmap-studio.js loaded and executing....");

var myApp = myApp || {};


function WorldMapEditBlock(runtime, element) {

    //rewrite the json so it is formatted nicely.
    var config = JSON.parse($('#config').val());
    var worldmapConfig = JSON.parse($('#worldmapConfig').val());

    $('#config' ).val(JSON.stringify(config,null, '\t'));
    $('#worldmapConfig' ).val(JSON.stringify(worldmapConfig,null, '\t'));

    var configEditor         = CodeMirror.fromTextArea($('#config')[0],         { mode: 'json', json: true, lineWrapping: true, lineNumbers:true});
    var worldmapConfigEditor = CodeMirror.fromTextArea($('#worldmapConfig')[0], { mode: 'json', json: true, lineWrapping: true, lineNumbers:true });
    var htmlEditor           = CodeMirror.fromTextArea($('#prose')[0],          { mode: 'text/html', lineWrapping: true, htmlMode: true });

    $(element).find('.save-button').bind('click', function() {

        //TODO:  add validation here

        //cleanse all the add'l info after last ":" in layer-control node titles
        $('#layer-controls',element).dynatree("getRoot").visit( function( n ) {
            var loc = n.data.title.lastIndexOf(":");
            n.data.title = n.data.title.substring(0, (loc!==-1? loc : n.data.title.length));
        });

        var data = {
            'display_name': $(element).find('.edit-display-name').val(),
            'config': configEditor.getValue(),
            'worldmapConfig': worldmapConfigEditor.getValue(),
            'prose': htmlEditor.getValue(),
            'highlights': config['highlights'],
            'questions':  config['questions'],
            'sliders':    worldmapConfig['sliders'],
            'layers':     worldmapConfig['layers'],
            'layer-controls': $('#layer-controls').dynatree("getTree").toDict(false),
            'href':       $("#map-url").val(),
            'lat':        parseFloat($("#center-lat").val()),
            'lon':        parseFloat($("#center-lon").val()),
            'zoom':       parseInt($("#zoom").val()),
            'width':      parseInt($("#map-width").val()),
            'height':     parseInt($("#map-height").val()),
            'baseLayer':  $("#map-baseLayer").val(),
            'debug':      $('#map-debug').attr('checked') === "checked",
            'stickyMap':  $('#map-sticky').attr('checked') === "checked"
        };

        $('.xblock-editor-error-message', element).html();
        $('.xblock-editor-error-message', element).css('display', 'none');
        var handlerUrl = runtime.handlerUrl(element, 'studio_submit');
        $.post(handlerUrl, JSON.stringify(data)).done(function(response) {
            if (response.result === 'success') {
                window.location.reload(false);
            } else {
                $('.xblock-editor-error-message', element).html('Error: '+response.message+' on tab: '+response.tab);
                $('.xblock-editor-error-message', element).css('display', 'block');
            }
        });
//        $('#worldmap-edit-dialogs').remove();
        geoDialog.empty().remove();
        constraintDialog.empty().remove();
        questionDialog.empty().remove();
        geoViewDialog.empty().remove();
    });
    $(element).find('.cancel-button').bind('click', function() {
       //TODO:  this is a hack to get around the fact that Studio doesn't remove these DOM objects
//        $('#worldmap-edit-dialogs,.dialog-form').each( function(i,o) {
//            console.log("-----------------------------------------------------");
//            console.log("removing from DOM: "+o['id']);
//            $('#'+o['id']).dialog().empty().remove();
//        })
       geoDialog.empty().remove();
       constraintDialog.empty().remove();
       questionDialog.empty().remove();
       geoViewDialog.empty().remove();
//        $('#worldmap-edit-dialogs').remove();
    });

    refreshGeoList();

    $('.map-tab .required').each(function() {
        $(this).change(function() {
            $(this).toggleClass('field-error', $(this).val() === "");
        });
    });
    $('.map-tab .required-integer').each(function() {
        $(this).change(function() {
            $(this).toggleClass('field-error', !$(this).val().match(/^[-+]?\d+$/));
        });
    });
    $('.map-tab .required-number').each(function() {
        $(this).change(function() {
            $(this).toggleClass('field-error', !$(this).val().match(/^[-+]?\d+\.?\d*$/));
        });
    });

    $('#add-reference-geometry').click( function() {
        config['highlights'].push( {
            id: 'new reference',
            geometry: {
                type: 'unknown',
                points: []
            }
        } );
        refreshGeoList();
       $('#prose-polygon-list').animate({scrollTop: 1000},{speed:'fast'});
    });

    //******************* Questions Tab ********************************
    $( "#sortable-questions" ).sortable({
       items: ".content",
       forcePlaceholderSize: true,
       update: function(e,ui) {
           var arr = $(e.target).find('.content');
           config['questions'].length = 0;
           for( var i=0; i<arr.length; i++) {
               var el = arr[i];
               $(el).attr('idx',i);
               config['questions'].push($(el).data('question'));
           }
       }
    }).disableSelection();
    $( ".content" ).disableSelection();

    refreshQuestions();
    refreshSliders();
    refreshSliderLayers();

    $('#new-slider').click(function() {
       worldmapConfig['sliders'].push({
           id: "slider-"+$.now()/1000,
           title:"New Slider"
       });
       refreshSliders();
       $('#sliders').animate({scrollTop: 1000},{speed:'fast'});

    });
    $('#new-sliderLayer').click(function() {
       worldmapConfig['layers'].push({
           id: "New Slider Layer",
           params: [
               { name:"param",  value:"0" }
           ]
       });
       refreshSliderLayers();
       $('#slider-layers').animate({scrollTop: 1000},{speed:'fast'});
    });

    $('#new-question').click( function() {
        inquire("Enter the html for a new question:","", function(b,v) {
            if( b ) {
                config['questions'].push( {
                    explanation: v,
                    id: "temp-"+$.now()/1000,
                    color: "00FF00",
                    type: "point",
                    hintAfterAttempt: 3,
                    hintDisplayTime: -1,
                    constraints:[]
                });
                refreshQuestions();
                $('#sortable-questions').animate({scrollTop: 1000},{speed:'fast'});
            }
        });
    });

    $('#new-constraint').click( function(e) {
        questionDialog.data('question')['constraints'].push(
            {
                "type": "unknown",
                "geometry": {
                   "type": "unknown"
                }
            }
        );
        refreshConstraints();
        $('#constraint-list').animate({scrollTop: 1000},{speed:'fast'});
        e.preventDefault();
    });
    /******************* Map Tab ************************/
    $("#map-url").val(worldmapConfig['href']);
    $("#map-width").val(worldmapConfig['width']);
    $("#map-height").val(worldmapConfig['height']);
    $("#map-baseLayer").val(worldmapConfig['baseLayer']);
    $("#map-debug").attr("checked",worldmapConfig['debug']);
    $("#center-lon").val(worldmapConfig['lon']);
    $("#center-lat").val(worldmapConfig['lat']);
    $("#zoom").val(worldmapConfig['zoom']);
    $("#map-sticky").attr("checked", worldmapConfig['stickyMap']);

    if( worldmapConfig['debug']) {
        $('.dev-only').removeClass('dev-only');  //removes the JSON tabs from the tabset
    }

    $('#layer-controls',element).dynatree({
        title: "LayerControls",
//            minExpandLevel: 1, // 1=rootnote not collapsible
        imagePath: 'public/js/vendor/dynatree/skin/',
//            autoFocus:true,
//            keyboard: true,
//            persist: true,
//            autoCollapse: false,
//            clickFolderMode: 3, //1:activate, 2:expand, 3: activate+expand
//            activeVisible: true, // make sure, active nodes are visible (expand)
        checkbox: false,
        selectMode: 1,
//            fx: null, // or  {height: "toggle", duration:200 }
//            noLink: true,
        debugLevel: 0, // 0:quiet, 1:normal, 2:debug
        onRender: function(node, nodeSpan) {
            $(nodeSpan).find('.dynatree-icon').remove();
        },
        children: worldmapConfig['layer-controls'],
        ajaxDefaults: null,
        clickFolderMode: 1, // 1:activate, 2:expand, 3: activate & expand
        onClick: function(n,event) {
            $('#new-node').enable(true);
            return true;
//            $('#new-node').enable(n.data.isFolder || n.data.children == null);
        },
        onDblClick: function(n,event) {
            layerControlDialog.data('node',n).dialog("open");
        },
        onActivate: function(n) {
//            $('#new-node').enable(n.data.isFolder || n.data.children == null);
            $('#new-node').enable(true);
        },
        onDeactivate: function(n) {
            $('#new-node').enable(false);
        },
        dnd: {
          onDragStart: function(node) {
            /** This function MUST be defined to enable dragging for the tree.
             *  Return false to cancel dragging of node.
             */
            logMsg("tree.onDragStart(%o)", node);
            return true;
          },
          onDragStop: function(node) {
            // This function is optional.
            logMsg("tree.onDragStop(%o)", node);
          },
          autoExpandMS: 1000,
          preventVoidMoves: true, // Prevent dropping nodes 'before self', etc.
          onDragEnter: function(node, sourceNode) {
            /** sourceNode may be null for non-dynatree droppables.
             *  Return false to disallow dropping on node. In this case
             *  onDragOver and onDragLeave are not called.
             *  Return 'over', 'before, or 'after' to force a hitMode.
             *  Return ['before', 'after'] to restrict available hitModes.
             *  Any other return value will calc the hitMode from the cursor position.
             */
            logMsg("tree.onDragEnter(%o, %o)", node, sourceNode);
            return node.data.isFolder ? true : "after";
          },
          onDragOver: function(node, sourceNode, hitMode) {
            /** Return false to disallow dropping this node.
             *
             */
            logMsg("tree.onDragOver(%o, %o, %o)", node, sourceNode, hitMode);
            // Prevent dropping a parent below it's own child
            if(node.isDescendantOf(sourceNode)){
              return false;
            }
            // Prohibit creating childs in non-folders (only sorting allowed)
            if( !node.data.isFolder ) {
                if( hitMode === "over" ) {
                    return "after";
                } else if ( node.data.children !== null ) { //don't allow dropping on root node
                    return false;
                }
            }
          },
          onDrop: function(node, sourceNode, hitMode, ui, draggable) {
            /** This function MUST be defined to enable dropping of items on
             * the tree.
             */
            logMsg("tree.onDrop(%o, %o, %s)", node, sourceNode, hitMode);
            if( node.data.isFolder && !node.isExpanded()) {
                sourceNode.move(node, "after");
            } else {
                sourceNode.move(node, hitMode);
                // expand the drop target
                sourceNode.expand(true);
            }
          },
          onDragLeave: function(node, sourceNode) {
            /** Always called if onDragEnter was called.
             */
            logMsg("tree.onDragLeave(%o, %o)", node, sourceNode);
          }
        }
    });

    $('#layer-controls',element).dynatree("getRoot").visit( function( n ) {
        if(n.data.isFolder || n.data.children == null) { //don't process root
            n.data.title = n.data.title+": "+ (n.data.isFolder? "(folder)" : "("+n.data.key+")");
            n.deactivate();
            if(n.data.isFolder && n.data.children != null) {
                n.expand(false);
            }
        } else {
            if( n.data.isVisible != undefined && n.data.isVisible == false) {
                n.data.title = n.data.title+": (hidden)";
                n.render();
            }
            n.expand(false);
        }
    });

    $('#new-node').click( function(e) {
        var n = $('#layer-controls',element).dynatree("getActiveNode");
        if( n ) {
            var newNode = {title: "New Item", key: ""};
            if (n.data.isFolder) {
                if (n.isExpanded()) {
                    newNode = n.addChild(newNode);
                } else {
                    newNode = n.parent.addChild(newNode, n);
                }
            } else if (n.data.children != null) {  //ROOT
                newNode = n.addChild(newNode);
                n.expand(true);
            } else {
                newNode = n.parent.addChild(newNode, n);
            }
            newNode.activate();
            $('#layer-control', element).animate({scrollTop: Math.max(0, newNode.span.offsetTop - 50)});
        } else {
            window.alert("Please select a node or folder where you want the new node to appear.");
        }
        e.preventDefault();
    });

    $('#new-param').click( function() {
        sliderLayerDialog.data('sliderLayer')['params'].push(
            { "name":"new param",  "value":0 }
        );
        refreshSliderLayerParams();
        $('#sliderLayer-params').animate({scrollTop: 1000},{speed:'fast'});
    });




    /******************** overall controls ********************/
    $(element).find('.cancel-button').bind('click', function() {
        runtime.notify('cancel', {});
    });

    $( "#tabs" ).tabs();

    var sliderDialog = $('#dialog-slider-form').dialog({
        autoOpen: false,
        height: 475,
        dialogClass: "no-close",
        width: 575,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    var slider = $(this).data('slider');
                    confirm("Are you sure you wish to delete?", function (b) {
                        if (b) {
                            for( var i in worldmapConfig['sliders']) {
                                if( worldmapConfig['sliders'][i]['id'] === slider.id) {
                                    worldmapConfig['sliders'].splice(i,1);
                                    break;
                                }
                            }
                            refreshSliders();
                            sliderDialog.dialog("close");
                        }
                    });
                },
                style: "margin-right:150px"
            },
            {
                text: "OK",
                click: function() {
                    var valid = true;
                    $('#dialog-slider-form .required').each( function() {
                        if( $(this).val() === "")valid = false;
                    });
                    $('#dialog-slider-form .required-number').change( function() {
                        if( !$.isNumeric($(this).val())) valid = false;
                    });
                    if( valid ) {
                        var slider = $(this).data('slider');
                        for (var i in worldmapConfig['sliders']) {
                            if (worldmapConfig['sliders'][i]['id'] === slider.id) {
                                worldmapConfig['sliders'][i]['title'] = $('#slider-title', this).val();
                                worldmapConfig['sliders'][i]['param'] = $('#slider-param', this).val();
                                worldmapConfig['sliders'][i]['max'] = parseInt($('#slider-max', this).val());
                                worldmapConfig['sliders'][i]['min'] = parseInt($('#slider-min', this).val());
                                worldmapConfig['sliders'][i]['increment'] = parseInt($('#slider-incr', this).val());
                                worldmapConfig['sliders'][i]['help'] = $('#slider-html', this).val();
                                worldmapConfig['sliders'][i]['position'] = $("#slider-position option:selected").val();
                                break;
                            }
                        }
                        refreshSliders();
                        $(this).dialog("close");
                    } else {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    }
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog( "close" );
                }
            }
        ],
        create: function() {
            $('#dialog-slider-form .required').change( function() {
                $(this).toggleClass('field-error', $(this).val() === "");
            });
            $('#dialog-slider-form .required-number').change( function() {
                $(this).toggleClass('field-error', !$.isNumeric($(this).val()));
            });
        },
        open: function() {
            var slider = $(this).data('slider');
            $('#slider-title',this).val(slider['title']);
            $('#slider-param',this).val(slider['param']);
            $('#slider-max',this).val(slider['max']);
            $('#slider-min',this).val(slider['min']);
            $('#slider-incr',this).val(slider['increment']);
            $('#slider-html',this).val(slider['help']);
            $('#slider-position option[value='+slider['position']+']',this).attr('selected','selected');
//            $('#dialog-slider-form .required').each( function() {
//                $(this).toggleClass('field-error', $(this).val() === "");
//            });
//            $('#dialog-slider-form .required-number').each( function() {
//                $(this).toggleClass('field-error', !$.isNumeric($(this).val()));
//            });
        }
    });

    var layerControlDialog = $('#dialog-layerControl-form').dialog({
        autoOpen: false,
        height: 375,
        dialogClass: "no-close",
        width: 460,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    var node = $(this).data('node');
                    if( !node.data.isFolder && node.data.children !== null ) {
                        window.alert("The root folder cannot be deleted.");
                    } else {
                        confirm("Are you sure you wish to delete?", function (b) {
                            if (b) {
                                node.remove();
                                layerControlDialog.dialog("close");
                            }
                        });
                    }
                },
                style: "margin-right:150px"
            },
            {
                text: "OK",
                click: function() {
                    var valid = true;
                    $('#dialog-layerControl-form .required').each( function() {
                        if($(this).is(':visible') && $(this).val() === "" ) valid = false;
                    });
                    if( !valid ) {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    } else {
                        var node = $(this).data('node');
                        var isRoot = !node.data.isFolder && node.data.children !== null;
                        var isFolder = $('#layerControl-isFolder').attr('checked') === "checked";
                        var key = $('#layerControl-key', this).val();
                        if (!isRoot) {
                            node.data.title = $('#layerControl-title', this).val() + (isFolder ? ": (folder)" : ": (" + key + ")")
                        } else {
                            node.data.isVisible=$('#layerControl-isVisible', this).is(":checked");
                            node.data.title = $('#layerControl-title', this).val() + (!node.data.isVisible ? ": (hidden)" : "")
                        }
                        if (!isRoot && !isFolder) node.data.key = key;
                        node.data.isFolder = isRoot ? false : isFolder;
                        if (!isRoot && !node.data.isFolder) {
                            node.removeChildren();
                            node.data.children = null;
                        }
                        node.render();
                        $(this).dialog("close");
                    }
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog( "close" );
                }
            }
        ],
        create: function () {
            $('#layerControl-isFolder').click(function() {
                var checked = $('#layerControl-isFolder').attr('checked') === "checked";
                if( !checked && layerControlDialog.data('node').data.children !== null ) {
                    confirm("This will delete the folder's contents, continue?", function (b) {
                        if (!b) {
                           checked = true;
                           $('#layerControl-isFolder').attr('checked',checked);
                        }
                        $('#layerControl-key-span').toggle(!checked);
                    });
                }
                $('#layerControl-key-span').toggle(!checked);
            });
            $('#dialog-layerControl-form .required').change( function() {
                $(this).toggleClass('field-error', $(this).val()==="");
            });

        },
        open: function() {
            var node = $(this).data('node');
            var title = node.data.title;
            var loc = title.lastIndexOf(":");
            title = title.substring(0, loc==-1?title.length:loc);
            $('#layerControl-title',this).val(title);
            var isRoot = !node.data.isFolder && node.data.children !== null;
            if( isRoot ) {  //root node
                $('#layerControl-key-span',this).hide();
                $('#layerControl-isFolder-span',this).hide();
                $('#layerControl-isVisible-span',this).show();
                $('#layerControl-isVisible',this).attr("checked", node.data.isVisible );
            } else if( !node.data.isFolder ) { //leaf node
                $('#layerControl-key', this).val(node.data.key);
                $('#layerControl-key-span', this).show();
                $('#layerControl-isFolder-span', this).show();
                $('#layerControl-isVisible-span',this).hide();
            } else if( node.data.isFolder ) { //folder
                $('#layerControl-key',this).val("");
                $('#layerControl-key-span', this).hide();
                $('#layerControl-isFolder-span', this).show();
                $('#layerControl-isVisible-span',this).hide();
            } else { //????
                debugger;
            }
            $('#layerControl-isFolder',this).attr("checked", node.data.isFolder );
            $('#dialog-layerControl-form .required').each( function() {
                $(this).toggleClass('field-error',$(this).val()==="");
            });
        }
    });

    var sliderLayerDialog = $('#dialog-sliderLayer-detail').dialog({
        autoOpen: false,
        height: 365,
        dialogClass: "no-close",
        width: 370,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    confirm("Are you sure you wish to delete?", function(b) {
                        if( b ) {
                            worldmapConfig['layers'].splice(sliderLayerDialog.data('idx'),1);
                            sliderLayerDialog.dialog("close");
                            refreshSliderLayers();
                        }
                    });
                },
                style: "margin-right: 60px"
            },
            {
                text: "OK",
                click: function() {
                    if( $('#sliderLayer-id',this).val() != "" ) {
                        worldmapConfig['layers'][sliderLayerDialog.data('idx')] = {
                            id: $('#sliderLayer-id', this).val(),
                            params: sliderLayerDialog.data('sliderLayer')['params']
                        };
                        refreshSliderLayers();
                        $(this).dialog("close");
                    } else {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    }
                }
            },
            {
                text: "Cancel",
                click: function() {
//                    refreshSliderLayers();
                    $(this).dialog( "close" );
                }
            }
        ],
        create: function() {
            $('#sliderLayer-id',this).change( function() {
                $(this).toggleClass('field-error', $(this).val() == "");
            });
        },
        open: function() {
            var sliderLayer = $(this).data('sliderLayer');
            $('#sliderLayer-id',this).val(sliderLayer['id']);
            refreshSliderLayerParams();
            $('#sliderLayer-id',this).toggleClass('field-error', $('#sliderLayer-id',this).val() == "");
        }
    });

    var paramDialog = $('#dialog-param-form').dialog({
        autoOpen: false,
        height: 290,
        dialogClass: "no-close",
        width: 390,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    confirm("Are you sure you wish to delete?", function(b) {
                        if( b ) {
                            sliderLayerDialog.data('sliderLayer')['params'].splice(paramDialog.data('idx'),1);
                            paramDialog.dialog("close");
                            refreshSliderLayerParams();
                        }
                    });
                },
                style: "margin-right: 35px"
            },
            {
                text: "OK",
                click: function() {
                    if( paramDialog.validate() ) {
                        sliderLayerDialog.data('sliderLayer')['params'][paramDialog.data('idx')] =
                            $('#param-type-range').is(":checked") ?
                            {
                                name: $('#param-name').val(),
                                min: parseFloat($('#param-min').val()),
                                max: parseFloat($('#param-max').val())
                            }
                                :
                            {
                                name: $('#param-name').val(),
                                value: parseFloat($('#param-value').val())
                            };
                        refreshSliderLayerParams();
                        $(this).dialog("close");
                    } else {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    }
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $(this).dialog( "close" );
                }
            }
        ],
        create: function() {
            var showHide = function () {
               if( $('#param-type-range').is(":checked")) {
                   $('#param-range-span').show();
                   $('#param-value-span').hide();
               } else {
                   $('#param-range-span').hide();
                   $('#param-value-span').show();
               }
            };
            $('#param-type-range').click(showHide );
            $('#param-type-value').click(showHide );
        },
        open: function() {
            var param = $(this).data('param');
            $('#param-name').val(param['name']);
            $('#param-value').val(param['value']);
            if( param['value'] && param['value'] !== "") {
                $('#param-type-value').prop("checked",true);
                $('#param-range-span').hide();
                $('#param-value-span').show();
            } else {
                $('#param-type-range').prop("checked",true);
                $('#param-range-span').show();
                $('#param-value-span').hide();
            }
            $('#param-min').val(param['min']);
            $('#param-max').val(param['max']);
            paramDialog.validate();
        }
    });
    paramDialog.validate = function() {
        var result = true;
        $('#dialog-param-form .required').each( function() {
            $(this).toggleClass('field-error',$(this).val()=="");
            if( $(this).is(':visible') && $(this).val()=="") {
                result = false;
            }
        });
        $('#dialog-param-form .required-number').each( function() {
            $(this).toggleClass('field-error',!$.isNumeric($(this).val()));
            if($(this).is(':visible') && !$.isNumeric($(this).val())){
                result = false;
            }
        });
        return result;
    };
    $('#dialog-param-form .required').change(paramDialog.validate);
    $('#dialog-param-form .required-number').change(paramDialog.validate);


    var questionDialog = $('#dialog-question-detail').dialog({
        autoOpen: false,
        height: 530,
        dialogClass: "no-close",
        width: 700,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    confirm("Are you sure you wish to delete?", function(b) {
                        if( b ) {
                            config['questions'].splice(questionDialog.data('idx'),1);
                            questionDialog.dialog("close");
                            refreshQuestions();
                        }
                    });
                },
                style: "margin-right:300px"
            },
            {
                text: "OK",
                click: function() {
                    if( questionDialog.validate() ) {
                        if ($('#response-type', questionDialog).val() == 'point' && questionDialog.data('question')['constraints'].length > 1) {
                            window.alert("A point response can only be evaluated against a single constraint");
                        } else {
                            config['questions'][questionDialog.data('idx')] = {
                                explanation: $('#explanation', this).val(),
                                id: $('#question-id', this).val(),
                                color: $('#color', this).val(),
                                type: $('#response-type', this).val(),
                                hintAfterAttempt: parseInt($('#hintAfterAttempt', this).val()),
                                hintDisplayTime: parseInt($('#hintDisplayTime', this).val()),
                                constraints: questionDialog.data('question')['constraints']
                            };
                            refreshQuestions();
                            questionDialog.dialog("close");
                        }
                    } else {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    }
                }

            },
            {
                text: "Cancel",
                click: function() {
                    refreshQuestions();
                    questionDialog.dialog( "close" );
                }
            }
        ],
        create: function() {
            $('#dialog-question-detail .required').change( function() {
                questionDialog.validate();
            });
        },
        open: function() {
            var q = questionDialog.data('question');
            $('#question-id',this).val(q['id']);
            $('#explanation',this).val(q['explanation']);
            $('#color',this).val(q['color']);
            $('#response-type option[value='+q['type']+']',this).attr('selected','selected');
            $('#hintAfterAttempt',this).val(q['hintAfterAttempt']);
            $('#hintDisplayTime',this).val(q['hintDisplayTime']);
            questionDialog.validate();
            refreshConstraints();
        }
    });
    questionDialog.validate = function() {
        var result = true;
        var msg = "";
        var required = false;
        $('#dialog-question-detail .required').each( function() {
            $(this).toggleClass('field-error',$(this).val()=="");
            if( $(this).val()=="") {
                required = true;
            }
        });
        var requiredNumber = false;
        $('#dialog-question-detail .required-number').each( function() {
            $(this).toggleClass('field-error',!$.isNumeric($(this).val()));
            if(!$.isNumeric($(this).val())){
                requiredNumber = true;
            }
        });
        var requiredInteger = false;
        $('#dialog-question-detail .required-integer').each( function() {
            $(this).toggleClass('field-error',!$(this).val().match(/^[-+]?\d+$/));
            if(!$(this).val().match(/^[-+]?\d+$/)){
                requiredInteger = true;
            }
        });
        var requiredColor = false;
        $('#dialog-question-detail .required-color').each( function() {
            $(this).toggleClass('field-error', !$(this).val().match(/^[0-9a-fA-F]{6}$/));
            if(!$(this).val().match(/^[0-9a-fA-F]{6}$/)){
                requiredColor = true;
            }
        });
        if( required ) {
            msg += "Required fields must not be empty<br/>";
            result = false;
        }
        if( requiredNumber ) {
            msg += "Field must be a number<br/>";
            result = false;
        }
        if( requiredInteger ) {
            msg += "Field must be an integer<br/>";
            result = false;
        }
        if( requiredColor ) {
            msg += "Field must be an color string (e.g. 00FF00 for green)<br/>";
            result = false;
        }
        $('#question-dialog-error').html(msg);
        return result;
    }

    if( $('#dialog-geo-view-form').length !== 1 ) {
        debugger;
    }

    var geoViewDialog = $("#dialog-geo-view-form").dialog({
        autoOpen: false,
        height: 500,
        dialogClass: "no-close",
        width: 500,
        modal: true,
        buttons: [
            {
                text: "OK",
                click: function() {
                    $('#center-lat').val(precision(4,geoViewDialog.data('centerLat')));
                    $('#center-lon').val(precision(4,geoViewDialog.data('centerLon')));
                    $('#zoom').val(geoViewDialog.data('zoom'));
                    geoViewDialog.dialog("close");
                }
            },
            {
                text: "Cancel",
                click: function() {
                    geoViewDialog.dialog( "close" );
                }
            }
        ],
        close: function() {
        },
        create: function(event, ui) {
        },
        open: function() {
            if( myApp.MESSAGING.getInstance().isPortalReady(getUniqueId('#dialog-geo-view-form')) ) {
                initGeoViewMap();
            } else {
                myApp.MESSAGING.getInstance().addHandler(getUniqueId('#dialog-geo-view-form'),"portalReady", initGeoViewMap);
            }
        }
    });


    $('#map-view-helper').on("click", "img", function () {
        geoViewDialog.dialog("open");
    });


    var geoDialog = $("#dialog-geo-form").dialog({
        autoOpen: false,
        height: 575,
        dialogClass: "no-close",
        width: 570,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    confirm("Are you sure you wish to delete?", function (b) {
                        if (b) {
                            config['highlights'].splice(geoDialog.data('idx'), 1);
                            geoDialog.dialog("close");
                            refreshGeoList();
                        }
                    });
                },
                style: "margin-right:170px"
            },
            {
                text: "OK",
                click: function() {
                    if( geoDialog.validate() ) {
                        config['highlights'][geoDialog.data('idx')] = geoDialog.data('highlight');
                        config['highlights'][geoDialog.data('idx')]['id'] = $('#reference-id',geoDialog).val();
                        refreshGeoList();
                        geoDialog.dialog("close");
                    } else {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    }

                }
            },
            {
                text: "Cancel",
                click: function() {
                    refreshGeoList();
                    geoDialog.dialog( "close" );
                }
            }
        ],
        close: function() {
        },
        create: function(event, ui) {
            $("#geo-boundary-type").change(onChangeGeoTool);
            $('#dialog-geo-form .required').each( function() {
                $(this).change(function() {
                    geoDialog.validate();
                });
            });
        },
        open: function() {
            $('#reference-id',this).val(geoDialog.data('highlight')['id']);

            $("#dialog-geo-form input[name=geo-boundary-type]").val([geoDialog.data('highlight')['geometry']['type']]);

            if( myApp.MESSAGING.getInstance().isPortalReady(getUniqueId('#dialog-geo-form')) ) {
                initGeoMap();
            } else {
                myApp.MESSAGING.getInstance().addHandler(getUniqueId('#dialog-geo-form'),"portalReady", initGeoMap);
            }
        }
    });

    geoDialog.validate = function() {
        var result = true;
        var msg = "";
        $('#reference-id').toggleClass('field-error', $('#reference-id').val() == "");
        if( $('#reference-id').val() == "") {
            result = false;
        }
        $("#dialog-geo-form #specify-geo").toggleClass('field-error', geoDialog.data('highlight')['geometry']['type'] == 'unknown');
        if( geoDialog.data('highlight')['geometry']['type'] == 'unknown' ) {
            result = false;
        }
        if( !result ) {
            msg += "Required fields must have values<br/>";
        }
        $('#dialog-geo-form-validation-msg').html(msg);
        return result;
    };

    var constraintDialog = $("#dialog-constraint-form").dialog({
        autoOpen: false,
        height: 600,
        dialogClass: "no-close",
        width: 725,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    confirm("Are you sure you wish to delete?", function(b) {
                        if( b ) {
                            questionDialog.data('question')['constraints'].splice(constraintDialog.data('idx'),1);
                            constraintDialog.dialog("close");
                            refreshConstraints();
                        }
                    });
                },
                style: "margin-right:250px"
            },
            {
                text: "OK",
                click: function() {
                    if( constraintDialog.validate() ) {
                        questionDialog.data('question')['constraints'][constraintDialog.data('idx')] = {
                            explanation: $('#constraint-explanation', constraintDialog).val(),
                            percentOfGrade: parseInt($('#constraint-percentOfGrade', constraintDialog).val()),
                            percentMatch: parseInt($('#constraint-percentMatch', constraintDialog).val()),
                            padding: parseInt($('#constraint-padding', constraintDialog).val()),
                            type: $('#constraint-type', constraintDialog).val(),
                            geometry: constraintDialog.data('constraint')['geometry']
                        };
                        refreshConstraints();
                        constraintDialog.dialog("close");
                    } else {
                        window.alert("Validation problems:\n\nFix errors before closing.");
                    }
                }
            },
            {
                text: "Cancel",
                click: function() {
                    refreshConstraints();
                    constraintDialog.dialog( "close" );
                }
            }
        ],
        close: function() {
        },
        create: function(event, ui) {
            $("#constraint-geometry-type").change(onChangeConstraintTool);
            $('#constraint-type').change(function() {
                constraintDialog.validate();
                if( $('#constraint-type',constraintDialog).val() === 'matches') {
                    $('#constraint-percentMatch-span').show();
                } else {
                    $('#constraint-percentMatch-span').hide();
                }
            });
            $('#dialog-constraint-form .required').change( function() {
                constraintDialog.validate();
            });
        },
        open: function() {

            $('#constraint-explanation',this).val(constraintDialog.data('constraint')['explanation']);
            $('#constraint-percentOfGrade',this).val(constraintDialog.data('constraint')['percentOfGrade']);
            $('#constraint-percentMatch',this).val(constraintDialog.data('constraint')['percentMatch']);
            $('#constraint-padding',this).val(constraintDialog.data('constraint')['padding']);
            $('#constraint-geometry-type option[value='+constraintDialog.data('constraint')['geometry']['type']+']',this).attr('selected','selected');
            $('#constraint-type option[value='+constraintDialog.data('constraint')['type']+']',this).attr('selected','selected');

            var responseType = constraintDialog.data('responseType');
            constraintDialog.dialog('option', 'title', 'Constraint on "'+responseType+'" user response');

            if( responseType === 'point' || $('#constraint-type',constraintDialog).val() !== 'matches' ) $('#constraint-percentMatch-span').hide();
            else $('#constraint-percentMatch-span').show();
            $('#constraint-type option[value="includes"]').attr('disabled',responseType === 'point');
            $('#constraint-type option[value="excludes"]').attr('disabled',responseType === 'point');
            $('#constraint-type option[value="matches"]').attr('disabled',responseType === 'point');
            if( responseType === 'point' ) {
                $('#constraint-type option[value="inside"]').attr('selected', 'selected');
            }

            constraintDialog.validate();

            if( myApp.MESSAGING.getInstance().isPortalReady(getUniqueId('#dialog-constraint-form')) ) {
                initConstraintMap();
            } else {
                myApp.MESSAGING.getInstance().addHandler(getUniqueId('#dialog-constraint-form'),"portalReady", initConstraintMap);
            }
        }
    });



    constraintDialog.validate = function() {
            var constraintGeoType = $('#constraint-geometry-type').val();
            var constraintType = $('#constraint-type').val();
            var responseType = constraintDialog.data('responseType');
            var result = true;
            var msg = "";
            if( responseType == 'polyline' ) {
                var compatible = (constraintType == 'matches' && constraintGeoType == 'polyline')
                  ||(constraintType == 'inside'  && constraintGeoType == 'polygon')
                  ||(constraintType == 'includes'&& constraintGeoType == 'point')
                  ||(constraintType == 'excludes'&& constraintGeoType == 'polygon');
                $('#constraint-type').toggleClass('field-error', !compatible);
                $('#constraint-geometry-type').toggleClass('field-error', !compatible);
                if( !compatible) {
                   msg += "Constraint type: "+$('#constraint-type').val()+"("+$('#constraint-geometry-type').val()+") is incompatible for a polyline user response<br/>";
                   result = false;
                }
            } else if( responseType == 'point') {
                $('#constraint-type').removeClass('field-error');
                $('#constraint-geometry-type').removeClass('field-error');
            }
            var requiredEmpty = false;
            if( $('#constraint-percentMatch').toggleClass('field-error', $('#constraint-type').val() === "matches" && $('#constraint-percentMatch').val() === "")
                .hasClass('field-error')) {
                requiredEmpty = true;
            }
            if( $('#constraint-percentOfGrade').toggleClass('field-error', $('#constraint-percentOfGrade').val() === "" )
                .hasClass('field-error') ) {
                requiredEmpty = true;
            }
            if( $('#constraint-padding').toggleClass('field-error',$('#constraint-padding').val() === "" )
                .hasClass('field-error') ) {
                requiredEmpty = true;
            }
            if( $('#constraint-explanation').toggleClass('field-error', $('#constraint-explanation').val() === "")
                .hasClass('field-error')) {
                requiredEmpty = true;
            }

            var requiredNumber = false;
            $('#dialog-constraint-form .required-number').each( function() {
                if( $(this).toggleClass('field-error',$(this).is(':visible') && !$.isNumeric($(this).val()))
                    .hasClass('field-error')) {
                    requiredNumber = true;
                }
            });

            if( requiredEmpty ) {
                result = false;
                msg += "Required fields are empty<br/>";
            }
            if( requiredNumber ) {
                result = false;
                msg += "Field value must be numeric<br/>";
            }
            $('#constraint-dialog-error').html(msg);

            return result;
        };

//    setupPortalReady(geoDialog, '#dialog-geo-form', 'highlight');
//    setupPortalReady(constraintDialog, '#dialog-constraint-form', 'constraint');
    setupPortalReady(geoDialog, 'highlight');
    setupPortalReady(constraintDialog, 'constraint');
    setupPortalReady(geoViewDialog);



    function setupPortalReady(dlg, uniqueId, item) {
        var id = dlg.attr('id');
        var uniqueId = getUniqueId('#'+id);
        if( !myApp.MESSAGING.getInstance().isPortalReady(uniqueId) ) {
            myApp.MESSAGING.getInstance().addHandler(uniqueId,"portalReady", function(m) {
                if( id == geoViewDialog.attr('id')) {
                    myApp.MESSAGING.getInstance().addHandler(uniqueId, "zoomend", function (m) {
                        dlg.data('zoom', m.getMessage());
                    });
                    myApp.MESSAGING.getInstance().addHandler(uniqueId, "moveend", function (m) {
                        var center = JSON.parse(m.getMessage())['center'];
                        dlg.data('centerLat', center['y']);
                        dlg.data('centerLon', center['x']);
                    });
                } else {
                    myApp.MESSAGING.getInstance().addHandler(uniqueId, "polygon_response", function (msg) {
                        var data = JSON.parse(JSON.parse(msg.message));
                        dlg.data(item)['geometry'] = {type: 'polygon', points: data['polygon']};
                    });
                    myApp.MESSAGING.getInstance().addHandler(uniqueId, "polyline_response", function (msg) {
                        var data = JSON.parse(JSON.parse(msg.message));
                        dlg.data(item)['geometry'] = {type: 'polyline', points: data['polyline']};
                    });
                    myApp.MESSAGING.getInstance().addHandler(uniqueId, "point_response", function (msg) {
                        var data = JSON.parse(JSON.parse(msg.message));
                        dlg.data(item)['geometry'] = {type: 'point', points: [data['point']]};
                    });
                }
            });
        }

    }


    function createHighlight(h,idx) {
        return $("<li class='select-list-item' >"+h['id']+"("+h['geometry']['type']+")</li>").data('highlight',h).data('idx',idx).dblclick(editGeometry);
    }
    function createConstraint(c,idx) {
        return $("<li class='select-list-item' >"+c['type']+"("+c['geometry']['type']+")</li>").data('constraint',c).data('idx',idx).dblclick(editConstraint);
    }
    function createSliderLayerParam(p,idx) {
        var data = "="+p['value'];
        if( p['value'] === undefined || p['value'] === "") {
            data = "=["+p['min']+"..."+p['max']+"]";
        }
        return $("<li class='select-list-item' >"+p['name']+data+"</li>").data('param',p).data('idx',idx).dblclick(function() {
            paramDialog.data('param',clone(p)).data('idx',idx).dialog("open");
        });
    }
    function createQuestionEntry(q) {
        return $('<li class="content ui-state-default select-list-item"><span class="ui-icon ui-icon-arrowthick-2-n-s"></span>'+q['explanation']+'</li>').data('question',q).dblclick(function(){
                    questionDialog.data('question',clone(q)).data('idx',$(this).attr('idx')).dialog("open");
                 });
    }
    function createSliderEntry(s) {
        return $('<li class="select-list-item slider-select-list-item">'+s['title']+ (s['param']? ' ('+s['param']+')' : '')+'</li>').data('slider',s).dblclick(function(){
                 sliderDialog.data('slider',clone(s)).dialog("open");
                 });
    }
    function createSliderLayerEntry(s,idx) {
        return $('<li class="select-list-item sliderLayer-select-list-item">'+s['id']+'</li>').data('sliderLayer',s).data('idx',idx).dblclick(function(){
                 sliderLayerDialog.data('sliderLayer',clone(s)).data('idx',idx).dialog("open");
                 });
    }

    function refreshQuestions() {
        $('#sortable-questions').empty().hide();
        for( var i in config['questions']) {
            createQuestionEntry(clone(config['questions'][i])).attr('idx',i).appendTo('#sortable-questions');
        }
        $('#sortable-questions').fadeIn('fast');
    }
    function refreshConstraints() {
        $('#constraint-list').empty().hide();
        var constraints = questionDialog.data('question')['constraints'];
        for( var i in constraints ) {
            createConstraint(clone(constraints[i]),i).appendTo($('#constraint-list'));
        }
        $('#constraint-list').fadeIn('fast');
    }
    function refreshSliderLayerParams() {
        $('#sliderLayer-params').empty().hide();
        var params = sliderLayerDialog.data('sliderLayer')['params'];
        for( var i in params ) {
            createSliderLayerParam(clone(params[i]),i).appendTo($('#sliderLayer-params'));
        }
        $('#sliderLayer-params').fadeIn('fast');
    }
    function refreshSliders() {
        $('#sliders').empty().hide();
        var sliders = worldmapConfig['sliders'];
        for( var i in sliders ) {
            createSliderEntry(clone(sliders[i])).appendTo($('#sliders'));
        }
        $('#sliders').fadeIn('fast');
    }
    function refreshSliderLayers() {
        $('#slider-layers').empty().hide();
        var sliderLayers = worldmapConfig['layers'];
        for( var i in sliderLayers ) {
            createSliderLayerEntry(clone(sliderLayers[i]),i).appendTo($('#slider-layers'));
        }
        $('#slider-layers').fadeIn('fast');
    }
    function onChangeGeoTool(e) {
        var type = $(e.target).val();
        $("#geometry-type-label").text("Specify "+type);
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("reset-answer-tool", null));
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("reset-highlights", null));
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("set-answer-tool", {type: type, color: '0000FF'}));
    }
    function onChangeConstraintTool(e) {
        var type = $(e.target).val();
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("reset-answer-tool", null));
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("reset-highlights", null));
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("set-answer-tool", {type: type, color: '0000FF'}));
        constraintDialog.validate();
    }

    function initGeoViewMap() {
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-view-form'), new myApp.Message("reset-highlights", null));
        if( $('#center-lon').val() != "" && $('#center-lat').val() != "") {
            var lon = parseFloat($('#center-lon').val());
            var lat = parseFloat($('#center-lat').val());
            setTimeout(function() {
                myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-view-form'), new myApp.Message("setCenter", {centerLat: lat, centerLon: lon}));
            },750);
        }
        if( $('#zoom').val() != "") {
            var zoom = parseInt($('#zoom').val());
            setTimeout(function() {
                myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-view-form'), new myApp.Message("setZoomLevel",zoom));
            }, 750);
        }
    }

    function initGeoMap() {
        var data = geoDialog.data('highlight')['geometry'];
        data['relativeZoom'] = -2;
        data['duration'] = -1;
        var type = $("#geo-boundary-type input:checked").val();
        $("#geometry-type-label").text("Specify "+ (type==undefined?"the type of geometry you wish to define":type));
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("reset-highlights", null));
        if( type != undefined) {
            myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("highlight-geometry", data));
            myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("set-answer-tool", {type: type, color: '0000FF'}));
        } else {
            myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-geo-form'), new myApp.Message("reset-answer-tool", null));
        }
    }

    function initConstraintMap() {
        var data = constraintDialog.data('constraint')['geometry'];
        data['relativeZoom'] = -2;
        data['duration'] = -1;
        var type = $("#constraint-geometry-type option:selected").val();
        myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("reset-highlights", null));
        if( type != undefined) {
            myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("highlight-geometry", data));
            myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("set-answer-tool", {type: type, color: '0000FF'}));
        } else {
            myApp.MESSAGING.getInstance().send(getUniqueId('#dialog-constraint-form'), new myApp.Message("reset-answer-tool", null));
        }
    }

    function refreshGeoList() {
        $('#prose-polygon-list').empty().hide();
        for( var i in config['highlights'] ) {
           createHighlight(clone(config['highlights'][i]),i).appendTo($('#prose-polygon-list'));
        }

        $('#prose-polygon-list').fadeIn('fast');
    }

    function editGeometry(e) {
         geoDialog.data('highlight', $(e.target).data('highlight')).data('idx', $(e.target).data('idx')).dialog('open');
    }

    function editConstraint(e) {
        var constraint = $(e.target).data('constraint');
        var idx = $(e.target).data('idx');
        constraintDialog.data('constraint', $(e.target)
            .data('constraint'))
            .data('idx', $(e.target).data('idx'))
            .data('responseType', $('#response-type').val())
            .dialog('open');
    }

    function getUniqueId(id) {
        return $(id).find('.frame').attr('id');
    }

    function confirm(msg,cb) {
        $("#dialog-confirm").html(msg);

        // Define the Dialog and its properties.
        $("#dialog-confirm").dialog({
            resizable: false,
            modal: true,
            title: "Confirm",
            height: 250,
            width: 400,
            buttons: {
                "Yes": function () {
                    $(this).dialog('close');
                    cb(true);
                },
                "No": function () {
                    $(this).dialog('close');
                    cb(false);
                }
            }
        });
    }

    function inquire(msg,initialValue, cb) {
        $("#dialog-inquire").html(msg+"<br/><textarea height='200px' width='80%'/>");
        $("#dialog-inquire textarea").val(initialValue).css('width','95%').css('height','70%');

        // Define the Dialog and its properties.
        $("#dialog-inquire").dialog({
            resizable: false,
            modal: true,
            title: "Inquire",
            height: 400,
            width: 600,
            buttons: {
                "OK": function () {
                    $(this).dialog('close');
                    cb(true, $('#dialog-inquire textarea').val());
                },
                "Cancel": function () {
                    $(this).dialog('close');
                    cb(false);
                }
            }
        });
    }
}

function precision( nDigits, val) {
    var str = val+" ";
    var loc = str.indexOf(".");
    if( loc != -1 ) {
        return str.substring(0,loc+nDigits+1);
    } else {
        return val;
    }
}

function clone(o) {
    return JSON.parse(JSON.stringify(o));
}
