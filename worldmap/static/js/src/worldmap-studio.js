/* Javascript for WorldMapXBlock studio view. */
"use strict";


function WorldMapXBlock(runtime, element) {

        $.ajax({
             type: "POST",
             url: runtime.handlerUrl(element, 'getConfig'),
             data: "null",
             success: function(result) {
                 alert("getConfig returned: "+result);
             }
        });


    }




