console.log("xBlockCom-master.js loaded - executing...");

var XB = XB || {};  // global used for xblock adapter scripts
/**
 * This controls the messaging between the master page and the slaves within the various iframes on the page
 */
XB.MESSAGING = (function Messaging() { // declare 'Singleton' as the return value of a self-executing anonymous function
    var _instance = null;
    var _constructor = function() {
        this.host = location.protocol+"//"+location.host+(location.host.indexOf(":") != -1 ? "" : (":"+(location.port ? location.port : "80")))+"/";
        this.clientCredentials = {};
        this.handlers = {};
        this.portalReady = [];
    };
    _constructor.prototype = { // *** prototypes will be "public" methods available to the instance
        setClientCredentials: function( id, creds ) {
             this.clientCredentials[id] = creds;
             console.log("setClientCredentials: xblockId: "+id+" host: "+creds.clientHost+"   uniqueId: "+creds.uniqueClientId);
        },
        setPortalReady: function(id) {
            this.portalReady.push(id);
        },
        isPortalReady: function(id) {
            for( var i=0; i< this.portalReady.length; i++ ) {
                if( this.portalReady[i] == id ) return true;
            }
            return false;
        },
        addHandler: function(id, type, h) {
           if( ! (id in this.handlers) ) {
              this.handlers[id] = {};
           }
           if( ! (type in this.handlers[id]) ) {
               this.handlers[id][type] = [];
           }
           this.handlers[id][type].push(h);
        },
        handleMessage: function(id,uniqId, msg) {
           var cred;
           try {
              cred = this.clientCredentials[id];
              cred.uniqueClientId; //make sure it exists
          } catch (e) {
              throw "SecurityException: cannot handle event for clientId: "+id+" - no such id.  Message: "+msg.getMessage();
          }
          if( cred.uniqueClientId != uniqId ) {  //SECURITY: make sure we've received credentials from this client
             throw "SecurityException: bad uniqueId("+uniqId+") for clientId: "+id+". Should be: "+this.clientCredentials[id].uniqueClientId;
          } else {
             if( id in this.handlers) {
                 if( msg.getType() in this.handlers[id] ) {
                     for( var i=0; i<this.handlers[id][msg.getType()].length; i++) {
                        try {
                            this.handlers[id][msg.getType()][i](msg);
                        } catch (e) { // SECURITY: make sure we have a handler for this message type
                            throw "SecurityException: in handler for id: "+id+" for message type: "+msg.getType()+" exception: "+e;
                        }
                     }
                 } else {
                     console.log("No handler found for id: "+id+" for message type: "+msg.getType());
                 }
             } else {
                 debugger;
                 console.log("No handlers found for id: "+id+ " could not find a message type: "+msg.getType());
             }
          }
        },
        send: function(id,msg) {
           var creds = this.clientCredentials[id];
           if( creds ) {
              creds.source.postMessage(JSON.stringify( {type: msg.getType(), message: msg.getMessageStr()}), creds.clientHost);
           } else {
              throw "SecurityException: unknown xblockId: "+id+"  can't send message type="+msg.getType()+"   message="+msg.getMessageStr();
           }
        },
        sendAll: function(msg) {
            for( var id in this.clientCredentials ) {
                var creds = this.clientCredentials[id];
                if( creds ) {
                   creds.source.postMessage(JSON.stringify( {type: msg.getType(), message: msg.getMessageStr()}), creds.clientHost);
                } else {
                   throw "SecurityException: unknown xblockId: "+id+"  can't send message type="+msg.getType()+"   message="+msg.getMessageStr();
                }
            }
        },
        getHost: function() {
           return this.host;
        }
    };
    return {
        // because getInstance is defined within the same scope, it can access the "private" '_instance' and '_constructor' vars
        getInstance: function() {
           if( !_instance ) {
              console.log("creating Messaging singleton");
              _instance = new _constructor();
           }
           return _instance;
        }
    }      
})();

XB.Message = function Message(t,m) {
   this.type = t;
   this.message = JSON.stringify(m);
}
XB.Message.prototype = {
    constructor: XB.Message,
    getType: function() { return this.type; },
    getMessage: function() { return JSON.parse(this.message); },
    getMessageStr: function() { return this.message; }

};

window.addEventListener('message',
    function(e){
        if( e.data.message.type == "init" ) {
           console.log("xBlockCom-master got an 'init'.  Sending back a master-acknowledge");
           XB.MESSAGING.getInstance().setClientCredentials(e.data.xblockId, {uniqueClientId: e.data.uniqueClientId, source: e.source, clientHost: e.origin});
           e.source.postMessage(JSON.stringify( new XB.Message("master-acknowledge",e.data.uniqueClientId)),e.origin);
        } else {
           if(e.data.message.type == "portalReady" ) {
               console.log("portalReady received at master code for id: "+ e.data.xblockId);
               XB.MESSAGING.getInstance().setPortalReady(e.data.xblockId);
           }
           var msg = new XB.Message(e.data.message.type, e.data.message.message);
           XB.MESSAGING.getInstance().handleMessage(e.data.xblockId, e.data.uniqueClientId, msg);
        }
    }, false);

$( document).ready(function() {
});