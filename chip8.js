/****************************************
* Required modules:                     *
* --------------------------------------*
* render.js (screen object for output)  *
* jquery.js (loading files from URL)    *
*****************************************/

'use strict';

var fileloaded = 0|0;
var game_speed = 10|0;

/* Path of file to open */
var path         = "https://ismouton.org/chip8/roms/";
var default_game = "INVADERS"
var url          = "https://ismouton.org/chip8/roms/" +  default_game; // default game map

/* constants used by chip-8 */
var max_stack_size = (24)|0;

/* Store 16 8-bit integers */
var register = [0xF];

/* 12-bit program counter */
var pc = (0x0)|0;

/* Designed to store max_stack_size number of 8-bit integers */
var stack = [max_stack_size];

/* Allocate 4KiB (max 12-bit addressable) of Memory */
var memory = [0xFFF];

/* Timers */
var cpu_tick = (0xFF)|0;
var snd_tick = (0xFF)|0;

/* 16-bit register for mostly memory operations */
var I = (0x0)|0;

/* illegal operation */
var halt = (0x0)|0;

/* Clamp to lower 16-bits and get I */
function getI() {
    return (I&0xFFFF)|0;
}

/* Clamp to lower 16-bits and set I */
function setI(value) {
    value = (value&0xFFFF)|0;

    I = value;
}

/* Use to initialize the system or reset */
function init() {
    /* Program counter points to lowest portion of exe block */
    pc = (0x200)|0;

    /* Registers set to default values */
    register[0x0]  = (0x0)|0;
    register[0x1]  = (0x0)|0;
    register[0x2]  = (0x0)|0;
    register[0x3]  = (0x0)|0;
    register[0x4]  = (0x0)|0;
    register[0x5]  = (0x0)|0;
    register[0x6]  = (0x0)|0;
    register[0x7]  = (0x0)|0;
    register[0x8]  = (0x0)|0;
    register[0x9]  = (0x0)|0;
    register[0xA]  = (0x0)|0;
    register[0xB]  = (0x0)|0;
    register[0xC]  = (0x0)|0;
    register[0xD]  = (0x0)|0;
    register[0xE]  = (0x0)|0;
    register[0xF]  = (0x0)|0;   //Doubles as carry flag

    setI(0x0);

    /* Clear the screen */
    screen.clear();

    (function() {
        var i;
        /* Clear the memory */
        for(i = 0; i <= 0xFFF; i++)
        {
            memory[i] = (0x0)|0;
        }
    }());

    /* Timers set to defaults */
    cpu_tick = (0xFF)|0;
    snd_tick = (0xFF)|0;

    /* Delete stack */
    stack.length = 0;
}

/* Clamp to lowest 8-bit and decrement */
function decrement(value) {
    /* initialized all arguments here */
    value = (value)|0;

    if (value <= 0x0)
    {
        value = 0x0;
    }
    else
    {
        value--;
    }

    return (value&0xFF)|0;
}

/* This operates on a 12-bit integer while increment() operates on 8-bit */
function incrementPC() {
        /* To simulate overflow of 12-bit integers */
        pc = ((pc+2)&0xFFF)|0;
}

/* 8-bit increment */
function increment(value) {
    /* initialized all arguments here */
    value = (value)|0;

    return ((++value)&0xFF)|0;
}

function stack_push(value) {
    /* initialized all arguments here */
    value = (value)|0;

    if (stack.length >= max_stack_size)
    {
        halt("Stack is larger than the maximum size! Craaaaash...");
        return;
    }

    stack.push((value&0xFFF)|0);
}

/* Pops 16bit values used for addresses */
function stack_pop() {
    if (stack.length <= 0)
    {
        halt("No values on the stack to pop! Crashing...");
        return;
    }
    return (stack.pop()&0xFFF)|0;
}

/* Halts cpu and returns human readable error */
function halt(error) {
    if(!error)
    {
        halt = 1;
    }
    halt = error;
}

/* returns 8-bit value stored in register */
function getV(number) {
    /* initialized all arguments here */
    number = (number)|0;

    if (number > 0xF)
    {
        halt("No register with name V" + number + "...");
        return;
    }
    return (register[number]&0xFF)|0;
}

/* returns 8-bit value from memory */
function getM(address) {
    /* initialized all arguments here */
    address = (address)|0;

    /* Characters - supposed to be stored in interpretter area
     * however this will be simulated in the function getM()
     */
    var C = [0xF];

    /* Character arrays set to default values */
    /*0*/C = [(0xF0)|0, (0x90)|0, (0x90)|0, (0x90)|0, (0xF0)|0,
    /*1*/(0x20)|0, (0x60)|0, (0x20)|0, (0x20)|0, (0x70)|0,
    /*2*/(0xF0)|0, (0x10)|0, (0xF0)|0, (0x80)|0, (0xF0)|0,
    /*3*/(0xF0)|0, (0x10)|0, (0xF0)|0, (0x10)|0, (0xF0)|0,
    /*4*/(0x90)|0, (0x90)|0, (0xF0)|0, (0x10)|0, (0x10)|0,
    /*5*/(0xF0)|0, (0x80)|0, (0xF0)|0, (0x10)|0, (0xF0)|0,
    /*6*/(0xF0)|0, (0x80)|0, (0xF0)|0, (0x90)|0, (0xF0)|0,
    /*7*/(0xF0)|0, (0x10)|0, (0x20)|0, (0x40)|0, (0x40)|0,
    /*8*/(0xF0)|0, (0x90)|0, (0xF0)|0, (0x90)|0, (0xF0)|0,
    /*9*/(0xF0)|0, (0x90)|0, (0xF0)|0, (0x10)|0, (0xF0)|0,
    /*A*/(0xF0)|0, (0x90)|0, (0xF0)|0, (0x90)|0, (0x90)|0,
    /*B*/(0xE0)|0, (0x90)|0, (0xE0)|0, (0x90)|0, (0xE0)|0,
    /*C*/(0xF0)|0, (0x80)|0, (0x80)|0, (0x80)|0, (0xF0)|0,
    /*D*/(0xE0)|0, (0x90)|0, (0x90)|0, (0x90)|0, (0xE0)|0,
    /*E*/(0xF0)|0, (0x80)|0, (0xF0)|0, (0x80)|0, (0xF0)|0,
    /*F*/(0xF0)|0, (0x80)|0, (0xF0)|0, (0x80)|0, (0x80)|0];

    /* if we are requesting the font memory then return that */
    if (address >= 0x00 && address <= 0x1FF) {
        /* Font Memory */
        return (C[address]&0xFF)|0;
    } else {
        /* CPU memory */
        return (memory[address]&0xFF)|0;
    }
}

function setV(number, value) {
     /* initialized all arguments here */
    number = (number)|0;
    value = (value&0xFF)|0;

    register[number] = value&0xFF;
}

/* Sets 8-bit value to memory */
function setM(address, value) {
    /* initialized all arguments here */
    address = (address)|0;
    value = (value)|0;

    return memory[address] = (value&0xFF)|0;
}

/* Jumps to 12-bit address */
function jump(address) {
    /* initialized all arguments here */
    address = (address)|0;
    pc = (address&0xFFF)|0;
}

function routine(address) {
    /* initialized all arguments here */
    address = (address)|0;

    stack_push(pc);
    pc = (address&0xFFF)|0;
}

document.getElementById('file-input').addEventListener('change',loadROMFile, false);

function loadROMFile(e) {
    init();

    var file = e.target.files[0];
    if (!file) {
        return;
    }
    
    var reader = new FileReader();

    reader.onload = function(e) {
        var romArray = new Uint8ClampedArray(e.target.result);

        (function() {
            /* put this rom in the memory map */
            for(var i = 0; i < romArray.byteLength; i++) {
                setM(0x200 + i, romArray[i]);
            }
        })();

        fileloaded = 1;
    };

    reader.readAsArrayBuffer(file);
}

function importROMFromURL(url) {
    /* Load program */
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function () {
        var romArray = new Uint8ClampedArray(xhr.response);
        (function() {
            /* initialize before loading rom */
            init();

            /* put this rom in the memory map */
            for(var i = 0; i < romArray.byteLength; i++) {
                setM(0x200 + i, romArray[i]);
            }
        })();

        fileloaded = 1;
    }

    xhr.send();
}

document.getElementById('game_selector').addEventListener('change',function(e){
    importROMFromURL(path + e.srcElement.value);
}, false);

function execute(opcode) {
    /* initialized all arguments here */
    opcode  =   (opcode)|0;
    var nnn =   ((opcode>>>0)&0xFFF)|0; /* 0nnn */
    var n   =   ((opcode>>>0)&0xF)|0;   /* 000n */
    var x   =   ((opcode>>>8)&0xF)|0;   /* 0x00 */
    var y   =   ((opcode>>>4)&0xF)|0;   /* 00y0 */
    var kk  =   ((opcode>>>0)&0xFF)|0;  /* 00kk */
    var prefix =((opcode>>>12)&0xF)|0   /* p000 */

    switch(prefix) {
        case 0x0:
            if(kk == 0xE0){screen.clear();}
            else if(kk == 0xEE){pc = stack_pop();}
            break;
        case 0x1:
            jump(nnn);
            break;
        case 0x2:
            routine(nnn);
            break;
        case 0x3:
            if(getV(x) == kk){incrementPC()}
            break;
        case 0x4:
            if(getV(x) != kk){incrementPC()}
            break;
        case 0x5:
            if(getV(x) == getV(y)){incrementPC()}
            break;
        case 0x6:
            setV(x, kk);
            break;
        case 0x7:
            setV(x, getV(x) + kk);
            break;
        case 0x8:
            if(n == 0x0){setV(x, getV(y))}
            else if(n == 0x1) { setV(x, getV(x)|getV(y)) }
            else if(n == 0x2) { setV(x, getV(x)&getV(y)) }
            else if(n == 0x3) { setV(x, getV(x)^getV(y)) }
            else if(n == 0x4) {
                /*The values of Vx and Vy are added together. If the result is greater than 8 bits (i.e., > 255,) VF is set to 1, otherwise 0. Only the lowest 8 bits of the result are kept, and stored in Vx.*/
                (function() {
                    var temp = getV(x) + getV(y);
                    if (temp > 0xFF) {
                        setV(0xF, 0x1); //Set Carry Flag
                    }

                    setV(x, temp&0xFF);
                })();
            }
            else if(n == 0x5) {
                /* If Vx > Vy, then VF is set to 1, otherwise 0. Then Vy is subtracted from Vx, and the results stored in Vx. */
                (function() {
                    var tempy = getV(x);
                    var tempx = getV(y);

                    if (tempx > tempy)  { /* set VF = NOT borrow. */
                        setV(0xF, 0x1); /* Set Carry Flag */
                    }
                    else {
                        setV(0xF, 0x0); /* Clear Carry Flag */
                    }

                    setV(x, (tempx - tempy)&0xFF);

                })();
            }
            else if(n == 0x6) {
                /* If the least-significant bit of Vx is 1, then VF is set to 1, otherwise 0. Then Vx is divided(same as shift right) by 2. */
                (function() {
                    var tempx = getV(x);

                    if(tempx&0x1) {
                        setV(0xF, 0x1); /* Set Carry Flag */
                    }
                    else {
                        setV(0xF, 0x0); /* Clear Carry Flag */
                    }

                    tempx = (tempx>>>1)|0; /* shift right one bit */

                })();
            }
            else if(n == 0x7) {
                (function() {
                    var tempy = getV(x);
                    var tempx = getV(y);

                    if (tempy > tempx) {  /* set VF = NOT borrow. */
                        setV(0xF, 0x1); /* Set Carry Flag */
                    }
                    else {
                        setV(0xF, 0x0); //Clear Carry Flag
                    }

                    setV(x, (tempy - tempx)&0xFF);
                })();
            }
            else if(n == 0xE) {
                (function() {
                    var tempx = getV(x);

                    if(tempx&0x80) {
                        setV(0xF, 0x1); //Set Carry Flag
                    }
                    else {
                        setV(0xF, 0x0); //Clear Carry Flag
                    }

                    tempx = (tempx<<1)|0; //shift left one bit
                })();
            }
            break;
        case 0x9:
            if (getV(x) != getV(y)){incrementPC();}
            break;
        case 0xA:
            setI(nnn);
            break;
        case 0xB:
            jump(nnn+getV(0));
            break;
        case 0xC:
            (function()
            {
                var random_number = (Math.random() * (0xFF - 0x0) + 0x0)|0;
                setV(x, random_number & kk);
            })();
            break;
        case 0xD:
            /* The interpreter reads n bytes from memory, starting at the address stored in I. These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). Sprites are XORed onto the existing screen. If this causes any pixels to be erased, VF is set to 1, otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, it wraps around to the opposite side of the screen. See instruction 8xy3 for more information on XOR, and section 2.4, Display, for more information on the Chip-8 screen and sprites. */
            (function() {
                var hit;
                var xcoor = getV(x);
                var ycoor = getV(y);
                var b0;
                var b1;
                var hit = 0;

                (function() {
                    var bit;
                    var counter;
                    for(counter = 0; counter < n; counter++) {
                        b0 = getM(getI()+counter);
                        for (bit = 0; bit < 8; bit++) {
                            if (b0 & (0x80>>>bit)) {
                                hit = screen.set_on(bit+xcoor, counter+ycoor);
                            }
                        }
                    }
                })();

                if (hit) {
                    setV(0xF, 0x1); //Set Carry Flag
                }
                else {
                    setV(0xF, 0x0); //Clear Carry Flag
                }
            })();
            break;
        case 0xE:
            if(kk == 0x9E) {
                //if (getV(x) == pollInput()){ incrementPC();}
            }
            if(kk == 0xA1) {
                //if (getV(x) != pollInput()){ incrementPC();}
                incrementPC();
            }
            break;
        case 0xF:
            if(kk == 0x07) {
                setV(x, cpu_tick);
            } else if(kk == 0x0A) {
                setV(x, pollInput());
            } else if(kk == 0x15) {
                cpu_tick = getV(x);
            } else if(kk == 0x18) {
                snd_tick = getV(x);
            } else if(kk == 0x1E) {
                setI(getV(x) + getI());
            } else if(kk == 0x29) {
                /* Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font. */
                setI(getV(x)*5);
            } else if(kk == 0x33) {
                /* Store BCD representation of Vx in memory locations I, I+1, and I+2.

                The interpreter takes the decimal value of Vx, and places the hundreds digit in memory at location in I, the tens digit at location I+1, and the ones digit at location I+2. */

                (function() {
                    var r0 = (getV(x)/100)|0;
                    var r1 = ((getV(x)/10)%10)|0;
                    var r2 = ((getV(x)%100)%10)|0;
                    setM(getI()+0, r0|0);
                    setM(getI()+1, r1|0);
                    setM(getI()+2, r2|0);
                })();

            } else if(kk == 0x55) {
                /* Stores V0 to VX in memory starting at address I.[4] */
                for(var counter = 0x0; counter <= x; counter++) {
                    setM(getI()+counter, getV(counter));
                }
            }
            else if(kk == 0x65) {
                /* Fills V0 to VX with values from memory starting at address I.[4] */
                for(var counter = 0x0; counter <= x; counter++) {
                    setV(counter, getM(getI()+counter));
                }
            }
            break;
    }

    /* One processor tick complete */
    cpu_tick = decrement(cpu_tick);
}

function fetch() {
    var b0 = getM(pc+0)<<8;
    var b1 = getM(pc+1);

    var opcode = ((b0) | (b1));

    /* increment program counter */
    incrementPC();

    /* return opcode from memory address stored in program counter */
    return (opcode)|0;
}

/* non-blocking */
function pollInput() {
    /* stub */
}

/* blocking */
function blockingPollInput() {
    /* Discard previous input */
    input = (-1)|0;
    var r_val;

    setInterval(function() {
        if(input > -1)
        {
            r_val = input;
            input = (-1)|0;
        }
    }, 0);

    return r_val;
}

var ticks = 0;

var screen = new Screen("game", 64, 32, 10);
init();

function main() {
    var opcode;
    setInterval(function() {
        if(fileloaded) {
            do {
                opcode = fetch();
                execute(opcode);
                ticks++;
            } while (ticks % (game_speed)|0 != 0);

            screen.render();

            /* Critical error occured halt execution cycle! */
            if (halt) {
                console.log(halt);
                this_is_not_a_valid_function();
            }
        }
    }, 17);
    screen.render();
}

importROMFromURL(url);

main();
