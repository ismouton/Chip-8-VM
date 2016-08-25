/*
 * MuttonRenderer
 */

/* Screen object */
//function Screen(c_id, x_resolution, y_resolution, arg_scale, options_obj)
function Screen(c_id, x_resolution, y_resolution, arg_scale)
{
    /* optional options */
    var scanlines;
    var motion_blur;


    /* check if args are sane */
    if (!c_id)
        halt = "No canvas_id supplied!";

    /* Screen used interally */
    var screen = [x_resolution * y_resolution];

    var canvas_y = y_resolution;
    var canvas_x = x_resolution;
    var scale = arg_scale;        /* How much to scale output? */

    /* canvas stuff */
    var canvas_id = c_id;
    var c_element = document.getElementById(canvas_id);
    var canvas = c_element.getContext("2d");

    /* Let's keep a list of the differences */
    var updated = [];

    /* We upscale it on the output */
    var id = canvas.createImageData(x_resolution*scale, y_resolution*scale);
    var d  = id.data;
    var coef = 0;

    /* Used for visual effects */
    var update_dimming = [];

    var self = this;

    var wrapify_coors = function(x,y)
    {
        /* normalize coordinates */
        if (x < 0)
        {
            x = ((x % canvas_x) + canvas_x);
        }
        else
        {
            x = x % canvas_x;
        }

        if (y < 0)
        {
            y = ((y % canvas_y) + canvas_y);
        }
        else
        {
            y = y % canvas_y;
        }

        return {x: x,y: y};
    }

    var get_canvas_index = function(x,y)
    {
        var xy = wrapify_coors(x,y);
        return (function(x,y)
        {
            return (((y*scale) * (canvas_x*scale) + (x*scale)) * 4);
        })(xy.x, xy.y);
    }

    /* Set pixel on screen - includes some mild scanlines */
    this.set_pixel = function(x,y,r,g,b)
    {
        var brightness = 1;
        var index = get_canvas_index(x,y);
        for (var i = 0; i < scale; i++)
        {
            for(var j = 0; j < scale; j++)
            {
                coef = (j*4)+(i*canvas_x*scale*4);

                if (i % 2 === 0)
                {
                    brightness = .75;
                }
                else
                {
                    brightness = 1;
                }

                d[index+0+coef] = (r * brightness)|0;
                d[index+1+coef] = (g * brightness)|0;
                d[index+2+coef] = (b * brightness)|0;
                d[index+3+coef] = 0xFF;
            }
        }
    }

    this.iterate_dimming = function(x,y)
    {
        var dimming = 0x10;
        var index = get_canvas_index(x,y);
        for (var i = 0; i < scale; i++)
        {
            for(var j = 0; j < scale; j++)
            {
                coef = (j*4)+(i*canvas_x*scale*4);

                d[index+0+coef] -= dimming;
                d[index+1+coef] -= dimming;
                d[index+2+coef] -= dimming;
                //d[index+3+coef] = 0xFF;

            }
        }
        return {r:d[index+0+coef], g:d[index+0+coef], b:d[index+0+coef]};
    }

    this.set_on = function(x,y)
    {
        var xy = wrapify_coors(x,y);
        return (function(x,y)
        {
            var hit = screen[y*canvas_x+x];
            if (!hit)
            {
                screen[y*canvas_x+x] = 1;
                self.set_pixel(x, y, 0xCC ,0xCC , 0x22);
            }
            else
            {
                screen[y*canvas_x+x] = 0;

                /* We need to mark it as off so we can emulate CRT image persistance */
                update_dimming.push({x:x,y:y});
                //self.set_pixel(x, y, 0x0, 0x0, 0x0);
            }
            return hit;
        })(xy.x, xy.y);
    }

    this.clear = function()
    {
        for (var y = 0; y < canvas_y; y++)
        {
            for (var x = 0; x < canvas_x; x++)
            {
                this.set_pixel(x, y, 0, 0, 0);
                screen[y*canvas_x+x] = 0;
            }
        }
    }


    this.render = function()
    {
        var r_val;
        var length = update_dimming.length;

        if (length)
        {
            for(var i = 0; i < length && update_dimming[i]; i++)
            {
                if(!screen[update_dimming[i].y*canvas_x+update_dimming[i].x])
                {
                    r_val = this.iterate_dimming(update_dimming[i].x,update_dimming[i].y)
                    if (r_val.r === 0 && r_val.g === 0 && r_val.b === 0)
                        update_dimming.splice(i, 1);
                }
            }
        }
        canvas.putImageData(id, 0, 0);
    }
}
