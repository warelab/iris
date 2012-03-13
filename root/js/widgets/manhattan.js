function Manhattan() {
    Widget.call(this);
	this.ctx;
    this.ctxi;
	this.canvasi;
    this.tool = new Object();
    this.tool.started = false;
    this.global_min = 0;
    this.global_max = 0;
    this.chr_lengths = new Array();
    this.total_len = 0;
    this.sc = 2;
    this.radius = 2;
    this.circles = true;
    this.XGUTTER = 10;
    this.color_by_density = true;
    this.containerNode;
    this.chr_range = new Array();
    this.score_a;
    this.score_b;
    this.mincolor = new Array();
    this.maxcolor = new Array();
};

Manhattan.prototype = new Widget();

// Implements widget_prototype.render
Manhattan.prototype.render = function(divId, args) {
    var div = $("#"+divId);
	div.text('');
	this.containerNode = div;
    var canvasHeight = Math.max(div.height(), 250);
    var canvasWidth = Math.max(div.width(), 100);
	div.append('<canvas id="'+divId+'_canvas", width='+canvasWidth+' height='+canvasHeight+' style="position:absolute;left:0;top:0;z-index:0;"></canvas>');
	div.append('<canvas id="'+divId+'_canvasi", width='+canvasWidth+' height='+canvasHeight+' style="position:absolute;left:0;top:0;z-index:1;"></canvas>');
    div.height(canvasHeight);
	
	div.parent.height=canvasHeight;
	div.parent.width=canvasWidth;

	var canvas = document.getElementById(divId+"_canvas");
	var canvasi = document.getElementById(divId+"_canvasi");
	this.canvasi = canvasi;
	this.ctx = canvas.getContext('2d');
	this.ctxi = canvasi.getContext('2d');

    var study = (args.hasOwnProperty('study')) ? args['study'] : 3396;
    var species = (args.hasOwnProperty('species')) ? args['species'] : 'at';

    // fetch the list of chromosomes and their lengths
    var widget = this;
    this.getJSON("/species/" + species + "/chromosomes", function(json) {
        for (var i = 0; i < json.length; i++) {
            widget.chr_lengths[i] = json[i][1];
            widget.total_len += json[i][1];
        }
        // fetch the max score for this study
        widget.getJSON("/gwas/" + study + "/maxscore", function(json) {
            widget.global_max = Math.ceil(json[0][0]);
            widget.draw_manhattan(study);
        });
    });
};

Manhattan.prototype.draw_manhattan = function(study, cvs) {
    // get the canvas
    var ctx = this.ctx;
    ctx.strokeStyle = "black";

    this.ctxi.strokeStyle = "red";
    this.ctxi.fillStyle = "rgba(255,0,0,0.3)";

    // add event listeners
	canvasi = this.canvasi;
    canvasi.addEventListener('mousedown', this.ev_mousedown(), false);
    canvasi.addEventListener('mousemove', this.ev_mousemove(), false);
    canvasi.addEventListener('mouseup',   this.ev_mouseup(),   false);

    var offset = this.XGUTTER;
    var ysize = ctx.canvas.height;
    for (var i = 0; i < this.chr_lengths.length; i++) {
        var xsize = (ctx.canvas.width - this.XGUTTER) * (this.chr_lengths[i] / this.total_len) - this.XGUTTER;
        this.do_scatter(ctx, study, i + 1, offset, xsize, ysize, this.chr_lengths[i]);
        offset += xsize + this.XGUTTER;
    }
};

Manhattan.prototype.canvas_to_chr = function(a, b) {
    this.chr_range = [];
    var offset = this.XGUTTER;
    var a_chr = 0;
    var b_chr = 0;
    var gutters = (this.chr_lengths.length + 1) * this.XGUTTER;
    var nt2px = (this.ctxi.canvas.width - gutters) / this.total_len;
    var a_pos, b_pos;
    for (var i = 0; i < this.chr_lengths.length; i++) {
        var chr_xsize = nt2px * this.chr_lengths[i];
        if (a >= offset - this.XGUTTER && a <= offset + chr_xsize) {
            a_chr = i + 1;
            a_pos = Math.floor(this.chr_lengths[i] * Math.max(a - offset, 0) / chr_xsize);
        }
        if (b >= offset && b <= offset + chr_xsize + this.XGUTTER) {
            b_chr = i + 1;
            b_pos = Math.ceil(this.chr_lengths[i] * Math.max(b - offset, 0) / chr_xsize);
        }
        offset += chr_xsize + this.XGUTTER;
    }
    if (a_chr <= b_chr && a_chr > 0) {
        if (a_chr === b_chr) {
            this.chr_range[0] = [a_chr, a_pos, b_pos];
        } else if (a_chr === b_chr - 1) {
            this.chr_range[0] = [a_chr, a_pos, this.chr_lengths[a_chr - 1]];
            this.chr_range[1] = [b_chr, 0, b_pos];
        } else {
            this.chr_range[0] = [a_chr, a_pos, this.chr_lengths[a_chr - 1]];
            for (var i = 1; i < b_chr - a_chr; i++) {
                this.chr_range[i] = [a_chr + i, 0, this.chr_lengths[a_chr + i - 1]];
            }
            this.chr_range[b_chr - a_chr] = [b_chr, 0, b_pos];
        }
    }
};

Manhattan.prototype.canvas_to_score = function(a, b) {
    this.score_a = this.global_max * (this.ctxi.canvas.height - a) / this.ctxi.canvas.height;
    this.score_b = this.global_max * (this.ctxi.canvas.height - b) / this.ctxi.canvas.height;
};

Manhattan.prototype.do_scatter = function(ctx, study, chr, offset, xsize, ysize, chr_length) {
    console.log("Doing scatter");
    var widget = this;
	var path = "/gwas/" + study + "/scatter"
			+ "?chr=" + chr
			+ "&b1=" + Math.floor(xsize / widget.sc)
			+ "&b2=" + Math.floor(ysize / widget.sc)
			+ "&x1=" + chr_length
			+ "&x2=" + widget.global_max;
    this.getJSON(path, function(json) {
        console.log("Manhattan: Chromosome " + chr);
        var xrange = chr_length;
        var yrange = widget.global_max;
        var xfactor = xsize / xrange;
        var yfactor = ysize / yrange;
        if (chr % 2 === 0) {
            ctx.fillStyle = "darkorange";
            widget.mincolor = [255, 165, 0];
            widget.maxcolor = [255, 0, 0];
        } else {
            ctx.fillStyle = "black";
            widget.mincolor = [150, 150, 150];
            widget.maxcolor = [0, 0, 0];
        }
        for (var i = 0; i < json.data.length; i++) {
            var rect = json.data[i];
            if (rect.length == 3) {
                // not a rectangle, just a point
                var x = xfactor * rect[0] + offset;
                var y = ysize - yfactor * rect[1];

                if (widget.color_by_density) {
                    var ratio = rect[2] / json.max;
                    var r = widget.mincolor[0] + Math.floor(ratio * (widget.maxcolor[0] - widget.mincolor[0]));
                    var g = widget.mincolor[1] + Math.floor(ratio * (widget.maxcolor[1] - widget.mincolor[1]));
                    var b = widget.mincolor[2] + Math.floor(ratio * (widget.maxcolor[2] - widget.mincolor[2]));

                    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                }

                if (widget.circles) {
                    ctx.beginPath();
                    ctx.arc(Math.floor(x), Math.floor(y), widget.radius, 0, 2 * Math.PI, true);
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(Math.floor(x), Math.floor(y), widget.sc, widget.sc);
                }
            } else {
                var width = xfactor * (rect[1] - rect[0]);
                var height = widget.sc + yfactor * (rect[3] - rect[2]);
                var x = xfactor * rect[0] + offset;
                var y = ysize - height - yfactor * rect[2];
                if (height < widget.sc) {
                    height = widget.sc;
                }
                if (width < widget.sc) {
                    width = widget.sc;
                }
                ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(width), Math.ceil(height));
            }
        }
    });
};


Manhattan.prototype.ev_mousedown = function() {
    var widget = this;
    return function(ev) {
        if (ev.layerX || ev.layerX == 0) {
            ev._x = ev.layerX;
            ev._y = ev.layerY;
        } else if (ev.offsetX || ev.offsetX == 0) {
            ev._x = ev.offsetX;
            ev._y = ev.offsetY;
        }
        widget.tool.started = true;
        widget.tool.x = ev._x;
        widget.tool.y = ev._y;
        widget.ctxi.clearRect(0, 0, widget.ctxi.canvas.width, widget.ctxi.canvas.height);
        widget.ctxi.strokeRect(widget.tool.x, widget.tool.y, 1, 1);
    };
};

Manhattan.prototype.ev_mousemove = function() {
    var widget = this;
    return function(ev) {
        if (widget.tool.started) {
            if (ev.layerX || ev.layerX == 0) {
                ev._x = ev.layerX;
                ev._y = ev.layerY;
            } else if (ev.offsetX || ev.offsetX == 0) {
                ev._x = ev.offsetX;
                ev._y = ev.offsetY;
            }
            var x = widget.tool.x < ev._x ? widget.tool.x : ev._x;
            var y = widget.tool.y < ev._y ? widget.tool.y : ev._y;
            var width = Math.abs(ev._x - widget.tool.x + 1);
            var height = Math.abs(ev._y - widget.tool.y + 1);
            widget.ctxi.clearRect(0, 0, widget.ctxi.canvas.width, widget.ctxi.canvas.height);
            widget.ctxi.fillRect(x, y, width, height);
            widget.ctxi.strokeRect(x, y, width, height);
        }
    };
};

Manhattan.prototype.ev_mouseup = function() {
    var widget = this;
    return function(ev) {
        if (widget.tool.started) {
            if (ev.layerX || ev.layerX == 0) {
                ev._x = ev.layerX;
                ev._y = ev.layerY;
            } else if (ev.offsetX || ev.offsetX == 0) {
                ev._x = ev.offsetX;
                ev._y = ev.offsetY;
            }
            var x1 = widget.tool.x;
            var x2 = ev._x;
            var y1 = widget.tool.y;
            var y2 = ev._y;
            if (widget.tool.x > ev._x) {
                x1 = ev._x;
                x2 = widget.tool.x;
            }
            if (widget.tool.y > ev._y) {
                y1 = ev._y;
                y2 = widget.tool.y;
            }
            // need to convert x, y pixels to intervals on chromosomes and scores
            widget.canvas_to_chr(x1, x2);
            widget.canvas_to_score(y1, y2);
            var chr_range_string = JSON.stringify(widget.chr_range);
            widget.tool.started = false;
            widget.ctxi.clearRect(0, 0, widget.ctxi.canvas.width, widget.ctxi.canvas.height);
						console.log([widget.score_b, widget.score_a, chr_range_string]);
            widget.getManager().notify(widget.containerNode.id, [widget.score_b, widget.score_a, chr_range_string]);
        }
    };
};

Widget.registerWidget('manhattan', Manhattan);
