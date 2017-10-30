// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.behaviors, "cr.behaviors not created");

/////////////////////////////////////
// Behavior class
cr.behaviors.PinScale = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var behaviorProto = cr.behaviors.PinScale.prototype;
		
	/////////////////////////////////////
	// Behavior type class
	behaviorProto.Type = function(behavior, objtype)
	{
		this.behavior = behavior;
		this.objtype = objtype;
		this.runtime = behavior.runtime;
	};
	
	var behtypeProto = behaviorProto.Type.prototype;

	behtypeProto.onCreate = function()
	{
	};

	/////////////////////////////////////
	// Behavior instance class
	behaviorProto.Instance = function(type, inst)
	{
		this.type = type;
		this.behavior = type.behavior;
		this.inst = inst;				// associated object instance to modify
		this.runtime = type.runtime;
	};
	
	var behinstProto = behaviorProto.Instance.prototype;

	behinstProto.onCreate = function()
	{
		this.pinObject = null;
		this.pinObjectUid = -1;		// for loading
		this.lastKnownWidth = 0;
		this.lastKnownHeight = 0;
		this.widthReference = 0;
		this.heightReference = 0;
		this.scaleWidth = 1;//This is for plugins with animation
		this.scaleHeight = 1;//since each frame might have different sizes
		this.changeWidth = false;
		this.changeHeight = false;
		this.mode = 0;				// 0 = position & angle; 1 = position; 2 = angle; 3 = rope; 4 = bar
		
		var self = this;
		
		// Need to know if pinned object gets destroyed
		if (!this.recycled)
		{
			this.myDestroyCallback = (function(inst) {
													self.onInstanceDestroyed(inst);
												});
		}
										
		this.runtime.addDestroyCallback(this.myDestroyCallback);
	};
	
	behinstProto.saveToJSON = function ()
	{
		return {
			"uid": this.pinObject ? this.pinObject.uid : -1,
			"lw": this.lastKnownWidth,
			"lh": this.lastKnownHeight,
			"wr": this.widthReference,
			"hr": this.heightReference,
			"cw": this.changeWidth,
			"ch": this.changeHeight,
			//"sw": this.scaleWidth,
			//"sh": this.scaleHeight,
			"m": this.mode
		};
	};
	
	behinstProto.loadFromJSON = function (o)
	{
		this.pinObjectUid = o["uid"];		// wait until afterLoad to look up		
		this.lastKnownWidth = o["lw"];
		this.lastKnownHeight = o["lh"];
		this.widthReference = o["wr"];
		this.heightReference = o["hr"];
		this.changeWidth = o["cw"];
		this.changeHeight = o["ch"];
		this.scaleWidth = o["sw"];
		this.scaleHeight = o["sh"];
		this.mode = o["m"];
	};
	
	behinstProto.afterLoad = function ()
	{
		// Look up the pinned object UID now getObjectByUID is available
		if (this.pinObjectUid === -1)
			this.pinObject = null;
		else
		{
			this.pinObject = this.runtime.getObjectByUID(this.pinObjectUid);
			assert2(this.pinObject, "Failed to find pin object by UID");
		}
		
		this.pinObjectUid = -1;
	};
	
	behinstProto.onInstanceDestroyed = function (inst)
	{
		// Pinned object being destroyed
		if (this.pinObject == inst)
			this.pinObject = null;
	};
	
	behinstProto.onDestroy = function()
	{
		this.pinObject = null;
		this.runtime.removeDestroyCallback(this.myDestroyCallback);
	};
	
	behinstProto.tick = function ()
	{
		// do work in tick2 instead, after events to get latest object position
	};

	behinstProto.tick2 = function ()
	{
		if (!this.pinObject)
			return;
			
		// Instance angle has changed by events/something else			
		if ( (this.changeWidth && this.lastKnownWidth !== this.pinObject.width)
			|| (this.changeHeight && this.lastKnownHeight !== this.pinObject.height) )
		{
			if (this.mode === 0)
			{
				if (this.changeWidth)
				{
					this.inst.width = this.pinObject.width * this.widthReference;
					if (this.inst.curFrame) this.inst.width *= this.inst.curFrame.width;
				}
				if (this.changeHeight)
				{
					this.inst.height = this.pinObject.height * this.heightReference;
					if (this.inst.curFrame) this.inst.height *= this.inst.curFrame.height;

				}
			}
			else if (this.mode === 1)
			{
				if (this.changeWidth) this.inst.width += this.pinObject.width - this.lastKnownWidth;
				if (this.changeHeight) this.inst.height += this.pinObject.height - this.lastKnownHeight;
				/*if (this.changeWidth)
				{
					if (this.inst.curFrame)
					{
						this.inst.width = this.inst.curFrame.width * this.scaleWidth + this.pinObject.;
					}
					else this.inst.width = this.pinObject.width + this.widthReference;
				}
				if (this.changeHeight)
				{
					this.inst.height += this.pinObject.height - this.heightReference;
					if (this.inst.curFrame)
					{
					}
					else this.inst.height = this.pinObject.height + this.heightReference;
				}*/
			}
			this.inst.set_bbox_changed();
			this.lastKnownWidth = this.pinObject.width;
			this.lastKnownHeight = this.pinObject.height;
		}
	};
	
	/**BEGIN-PREVIEWONLY**/
	behinstProto.getDebuggerValues = function (propsections)
	{
		propsections.push({
			"title": this.type.name,
			"properties": [
				{"name": "Is pinned", "value": !!this.pinObject, "readonly": true},
				{"name": "Pinned UID", "value": this.pinObject ? this.pinObject.uid : 0, "readonly": true}
			]
		});
	};
	/**END-PREVIEWONLY**/

	//////////////////////////////////////
	// Conditions
	function Cnds() {};

	Cnds.prototype.IsPinned = function ()
	{
		return !!this.pinObject;
	};
	
	behaviorProto.cnds = new Cnds();

	//////////////////////////////////////
	// Actions
	function Acts() {};

	Acts.prototype.Pin = function (obj, mode_, props_)
	{
		if (!obj)
			return;
			
		var otherinst = obj.getFirstPicked(this.inst);
		
		if (!otherinst)
			return;
			
		this.pinObject = otherinst;
		this.changeWidth = props_ === 0 || props_ === 1;
		this.changeHeight = props_ === 0 || props_ === 2;
		this.lastKnownWidth = this.pinObject.width;
		this.lastKnownHeight = this.pinObject.height;
		this.mode = mode_;
		if (mode_ === 0){
			this.widthReference = this.inst.width / this.pinObject.width;
			if (this.inst.curFrame)	this.widthReference /= this.inst.curFrame.width;
			this.heightReference = this.inst.height / this.pinObject.height;
			if (this.inst.curFrame)	this.heightReference /= this.inst.curFrame.height;
		}
		else if (mode_ === 1){
			if (this.inst.curFrame)
			{
				console.log("Not finished if using animation with different sizes.");
				this.scaleWidth = this.inst.width/this.inst.curFrame.width;
				this.scaleHeight = this.inst.height/this.inst.curFrame.height;
				this.widthReference = this.pinObject.width;
				this.heightReference = this.pinObject.height;
			}
			else
			{			
				this.widthReference = this.inst.width - this.pinObject.width;
				this.heightReference = this.inst.height - this.pinObject.height;
			}
		}
	};
	
	Acts.prototype.Unpin = function ()
	{
		this.pinObject = null;
	};
	
	behaviorProto.acts = new Acts();

	//////////////////////////////////////
	// Expressions
	function Exps() {};

	Exps.prototype.PinnedUID = function (ret)
	{
		ret.set_int(this.pinObject ? this.pinObject.uid : -1);
	};
	
	behaviorProto.exps = new Exps();
	
}());