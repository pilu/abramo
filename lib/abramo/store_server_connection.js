var storeDebug          = require('./store_debug'),
    storeServerResponse = require('./store_server_response'),
    sys                 = require('sys'),
    url                 = require('url');

var StoreServerConnection = exports.StoreServerConnection = function(store, request, response) {  
  this.store                = store;
  this.request              = request;
  this.response             = response;
  this.inputData            = "";
  this.method               = request.method;
  var _url                  = url.parse(request.url, true);
  this.path                 = _url.pathname;
  this.options              = _url.query || {};
  this.storeServerResponse  = new storeServerResponse.StoreServerResponse(response);
  this.request.on("data", this.dataListener.bind(this));
  this.request.on("end",  this.endListener.bind(this));  
};

StoreServerConnection.prototype.dataListener = function(chunk) {
  if (this.method == 'PUT') {
    this.inputData += chunk;
  }
};

StoreServerConnection.prototype.endListener = function() {
  var method = "handle" + this.method + "Request";
  if (this[method]) {
    this[method]();
  }
  storeDebug.debug(this.method + ": " + this.path + " " + this.storeServerResponse.status);
  this.storeServerResponse.end();
};

StoreServerConnection.prototype.handleGETRequest = function() {  
  var value = this.store.get(this.path);
  if (value !== undefined) {
    this.storeServerResponse.status = 200;
    this.storeServerResponse.body.value   = value.value;
    this.storeServerResponse.body.info    = value.info;
    if (this.options.include_children == 'true') {
      this.storeServerResponse.body.children  = value.children;
    }
  } else {
    this.storeServerResponse.status = 404;
  }
};

StoreServerConnection.prototype.handlePUTRequest = function() {  
  try {
    var value = JSON.parse(this.inputData);
    this.store.set(this.path, value);
    this.storeServerResponse.status   = 201;
    this.storeServerResponse.location = this.path;
  } catch (err) {    
    this.storeServerResponse.status   = 400;
    this.storeServerResponse.body.message  = "Invalid JSON"
  }
};

StoreServerConnection.prototype.handleDELETERequest = function() {    
  if (this.store.get(this.path) !== undefined) {
    this.store.del(this.path);
    this.storeServerResponse.status = 200;    
  } else {
    this.storeServerResponse.status = 404;
  }
};