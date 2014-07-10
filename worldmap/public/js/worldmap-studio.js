function WorldMapEditBlock(runtime, element) {
    var jsonEditorTextarea = $('.block-json-editor', element);
    var jsonEditorTextarea2 = $('.block-json-editor2', element);
    var jsonEditor = CodeMirror.fromTextArea(jsonEditorTextarea[0], { mode: 'json', json: true, lineWrapping: true, lineNumbers:true});
    var jsonEditor2 =CodeMirror.fromTextArea(jsonEditorTextarea2[0], { mode: 'json', json: true, lineWrapping: true, lineNumbers:true });

    $(element).find('.save-button').bind('click', function() {
        var data = {
            'display_name': $(element).find('.edit-display-name').val(),
            'config': jsonEditor.getValue(),
            'worldmapConfig': jsonEditor2.getValue()
        };

        $('.xblock-editor-error-message', element).html();
        $('.xblock-editor-error-message', element).css('display', 'none');
        var handlerUrl = runtime.handlerUrl(element, 'studio_submit');
        $.post(handlerUrl, JSON.stringify(data)).done(function(response) {
            if (response.result === 'success') {
                window.location.reload(false);
            } else {
                $('.xblock-editor-error-message', element).html('Error: '+response.message+' on tab: '+response.tab);
//                var loc = response.message.indexOf("(char ");
//                if( loc != -1) {
//                    var charLoc = parseInt(response.message.substring(loc+6,response.message.indexOf(")",loc)));
//                    if( response.tab == "Questions") {
//                        $('.block-json-editor', element).setCursorPosition(charLoc)
//                    } else if( response.tab == "Map config") {
//                        $('.block-json-editor2', element).setCursorPosition(charLoc)
//                    }
//                }
                $('.xblock-editor-error-message', element).css('display', 'block');
            }
        });
    });

    $(element).find('.cancel-button').bind('click', function() {
        runtime.notify('cancel', {});
    });

    $( "#tabs" ).tabs();

}

