console.log("worldmap.js loaded and executing....");

var myApp = myApp || {};


function WorldMapEditBlock(runtime, element) {
//    var jsonEditorTextarea = $('.block-json-editor', element);
//    var jsonEditorTextarea2 = $('.block-json-editor2', element);
//    var htmlEditorTextarea =  $('.block-html-editor', element);

    //rewrite the json so it is formatted nicely.
    var config = JSON.parse($('#config').val());
    var worldmapConfig = JSON.parse($('#worldmapConfig').val());

    $('#config' ).val(JSON.stringify(config,null, '\t'));
    $('#worldmapConfig' ).val(JSON.stringify(worldmapConfig,null, '\t'));

    var configEditor         = CodeMirror.fromTextArea($('#config')[0],         { mode: 'json', json: true, lineWrapping: true, lineNumbers:true});
    var worldmapConfigEditor = CodeMirror.fromTextArea($('#worldmapConfig')[0], { mode: 'json', json: true, lineWrapping: true, lineNumbers:true });
    var htmlEditor           = CodeMirror.fromTextArea($('#prose')[0],          { mode: 'text/html', lineWrapping: true, htmlMode: true });

    $(element).find('.save-button').bind('click', function() {
        var data = {
            'display_name': $(element).find('.edit-display-name').val(),
            'config': configEditor.getValue(),
            'worldmapConfig': worldmapConfigEditor.getValue(),
            'prose': htmlEditor.getValue(),
            'highlights': config['highlights']
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
    });

    for( var i in config['highlights'] ) {
        $('#prose-polygon-list').append("<li class='highlight-geometry' id='"+config['highlights'][i]['id']+"'>"+config['highlights'][i]['id']+"("+config['highlights'][i]['geometry']['type']+")</li>");
    }

    $('.highlight-geometry').click( editGeometry );

    $('#add-reference-geometry').click( function() {
        config['highlights'].push( {
            id: 'new reference',
            geometry: {
                type: 'unknown',
                points: []
            }
        } );
        refresh();
    });

    $(element).find('.cancel-button').bind('click', function() {
        runtime.notify('cancel', {});
    });

    $( "#tabs" ).tabs();


    var geoDialog = $("#dialog-geo-form").dialog({
        autoOpen: false,
        height: 500,
        dialogClass: "no-close",
        width: 650,
        modal: true,
        buttons: [
            {
                text: "Delete",
                click: function() {
                    confirm("Are you sure you wish to delete?", function(b) {
                        if( b ) {
                            config['highlights'].splice(geoDialog.data('idx'),1);
                            geoDialog.dialog("close");
                            refresh();
                        }
                    });
                },
                style: "margin-right:250px"
            },
            {
                text: "Set Geometry",
                click: function() {
                    config['highlights'][geoDialog.data('idx')] = geoDialog.data('highlight');
                    config['highlights'][geoDialog.data('idx')]['id'] = $('#id',geoDialog).val();
                    refresh();
                    geoDialog.dialog("close");

                }
            },
            {
                text: "Cancel",
                click: function() {
                    geoDialog.dialog( "close" );
                }
            }
        ],
        close: function() {
            console.log("geoDialog.close() called");
        },
        create: function(event, ui) {
            console.log("geoDialog.create() called");
            $("#geo-boundary-type").change(onChangeTool);
        },
        open: function() {
            console.log("geoDialog.open() called");
            $('#id',this).val(geoDialog.data('highlight')['id']);

            $("input[name=geo-boundary-type]").val([geoDialog.data('highlight')['geometry']['type']]);

//            onChangeTool();

            if( myApp.MESSAGING.getInstance().isPortalReady(getUniqueId()) ) {
                initMap();
            } else {
                myApp.MESSAGING.getInstance().addHandler(getUniqueId(),"portalReady", initMap);
            }
        }
    });

    if( !myApp.MESSAGING.getInstance().isPortalReady(getUniqueId()) ) {
        console.log("portal NOT READY - setup portalReady handler that will eventually setup xyz_response handlers for id: "+getUniqueId());
        myApp.MESSAGING.getInstance().addHandler(getUniqueId(),"portalReady", function(m) {
            console.log("portalReady message received, setting up xyz_response handlers for id: "+getUniqueId());
            myApp.MESSAGING.getInstance().addHandler(getUniqueId(),"polygon_response", function(msg) {
                var data = JSON.parse(JSON.parse(msg.message));
                geoDialog.data('highlight')['geometry'] = {type:'polygon', points: data['polygon']};
            });
            myApp.MESSAGING.getInstance().addHandler(getUniqueId(),"polyline_response", function(msg) {
                var data = JSON.parse(JSON.parse(msg.message));
                geoDialog.data('highlight')['geometry'] = {type:'polyline', points: data['polyline']};
            });
            myApp.MESSAGING.getInstance().addHandler(getUniqueId(),"point_response", function(msg) {
                var data = JSON.parse(JSON.parse(msg.message));
                geoDialog.data('highlight')['geometry'] = {type:'point', points: [data['point']]};
            });
        });
    }

    function onChangeTool(obj) {
        console.log("onChangeTool() called");
        var type = $("#geo-boundary-type input:checked").val();
        $("#geometry-type-label").text("Specify "+type);
        myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("reset-answer-tool", null));
        myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("reset-highlights", null));
        myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("set-answer-tool", {type: type, color: '0000FF'}));
    }

    function initMap() {
        console.log("initMap() called");
        var data = geoDialog.data('highlight')['geometry'];
        data['relativeZoom'] = -2;
        data['duration'] = -1;
        var type = $("#geo-boundary-type input:checked").val();
        $("#geometry-type-label").text("Specify "+ (type==undefined?"the type of geometry you wish to define":type));
//        myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("reset-answer-tool", null));
//        myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("set-answer-tool", {type: data['type']}));
        if( type != undefined) {
            myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("highlight-geometry", data));
            myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("set-answer-tool", {type: type, color: '0000FF'}));
        } else {
            myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("reset-answer-tool", null));
            myApp.MESSAGING.getInstance().send(getUniqueId(), new myApp.Message("reset-highlights", null));
        }
    }
    function refresh() {
        $('#prose-polygon-list').empty().hide();
        for( var i in config['highlights'] ) {
            var html = "<li class='highlight-geometry' id='"+config['highlights'][i]['id']+"'>"+config['highlights'][i]['id']+"("+config['highlights'][i]['geometry']['type']+")</li>";
            console.log("list element: "+html);
            $('#prose-polygon-list').append(html);
        }
        $('#prose-polygon-list').fadeIn('fast');
        $('.highlight-geometry').click( editGeometry );
    }

    function editGeometry(e) {
        for( var i in config['highlights'] ) {
            if( config['highlights'][i]['id'] == e.target.id) {
                geoDialog.data('highlight',JSON.parse(JSON.stringify(config['highlights'][i]))).data('idx',i).dialog('open');
            }
        }
    }

    function getUniqueId() {
        return $('#dialog-geo-form').find('.frame').attr('id');
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
}


//var dialog, form;
//
//dialog = $( "#dialog-geo-form" ).dialog({
//  autoOpen: false,
//  height: 500,
//  dialogClass: "no-close",
//  width: 650,
//  modal: true,
//  buttons: {
//    "Set Polygon": setPolygon,
//    Cancel: function() {
//      dialog.dialog( "close" );
//    }
//  },
//  close: function() {
//    form[ 0 ].reset();
//  }
//});
//
//form = dialog.find( "form" ).on( "submit", function( event ) {
//  event.preventDefault();
//  window.alert("this is where we would store the polygon");
//});


