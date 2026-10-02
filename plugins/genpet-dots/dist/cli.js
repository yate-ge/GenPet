#!/usr/bin/env node
import { createRequire as __genpetCreateRequire } from 'node:module'; const require = __genpetCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target2) => (target2 = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target2, "default", { value: mod, enumerable: true }) : target2,
  mod
));

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var ChunkStream = module.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i = 0; i < imagePasses.length; i++) {
        let pass = imagePasses[i];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i });
        }
      }
      return images;
    };
    exports.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports, module) {
    "use strict";
    module.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports, module) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i = 0; i < passes.length; i++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i].width, bpp, depth),
            height: passes[i].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports, module) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i = 0; i < 256; i++) {
        let currentCrc = i;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i] = currentCrc;
      }
    })();
    var CrcCalculator = module.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module.exports = function(options, dependencies) {
      this._options = options;
      options.checkCRC = options.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants.PNG_SIGNATURE;
      for (let i = 0; i < signature.length; i++) {
        if (data[i] !== signature[i]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name = "";
      for (let i = 4; i < 8; i++) {
        name += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries = Math.floor(data.length / 3);
      for (let i = 0; i < entries; i++) {
        this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i = 0; i < data.length; i++) {
          this._palette[i][3] = data[i];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i = 0;
      function split() {
        if (i === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i];
        i++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i];
            i++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports, module) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = color[i];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i = 0; i < 4; i++) {
              outdata[pxPos + i] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = Math.floor(
              indata[pxPos + i] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module.exports = function(indata, imageData, skipRescale = false) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8 && !skipRescale) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var zlib = __require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module.exports = function(options) {
      ChunkStream.call(this);
      this._parser = new Parser(options, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
          this._inflate = zlib.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk) {
            if (!leftToInflate) {
              return;
            }
            if (chunk.length > leftToInflate) {
              chunk = chunk.slice(0, leftToInflate);
            }
            leftToInflate -= chunk.length;
            filterWrite(chunk);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(
          bitmapData,
          this._bitmapInfo,
          this._options.skipRescale
        );
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    module.exports = function(dataIn, width, height, options) {
      let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(
        options.colorType
      ) !== -1;
      if (options.colorType === options.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
      if (inBpp === 4 && !options.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
      if (options.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options.inputColorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options.inputColorType + " is not supported at present"
            );
        }
        if (options.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options.colorType) {
            case constants.COLORTYPE_COLOR_ALPHA:
            case constants.COLORTYPE_COLOR:
              if (options.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants.COLORTYPE_ALPHA:
            case constants.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports, module) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i = pxPos; i < length; i++) {
        sum += Math.abs(pxData[i]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module.exports = function(pxData, width, height, options, bpp) {
      let filterTypes;
      if (!("filterType" in options) || options.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options.filterType === "number") {
        filterTypes = [options.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i = 0; i < filterTypes.length; i++) {
            let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib = __require("zlib");
    var Packer = module.exports = function(options) {
      this._options = options;
      options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
      options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
      options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
      options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
      options.deflateFactory = options.deflateFactory || zlib.createDeflate;
      options.bitDepth = options.bitDepth || 8;
      options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
      options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.colorType) === -1) {
        throw new Error(
          "option color type:" + options.colorType + " is not supported at present"
        );
      }
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options.inputColorType + " is not supported at present"
        );
      }
      if (options.bitDepth !== 8 && options.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
      return this._packChunk(constants.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var constants = require_constants();
    var Packer = require_packer();
    var PackerAsync = module.exports = function(opt) {
      Stream.call(this);
      let options = opt || {};
      this._packer = new Packer(options);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports, module) {
    "use strict";
    var assert = __require("assert").ok;
    var zlib = __require("zlib");
    var util = __require("util");
    var kMaxLength = __require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
        opts.chunkSize = zlib.Z_MIN_CHUNK;
      }
      zlib.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
      }
      let self2 = this;
      let availInBefore = chunk && chunk.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self2._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self2._buffer.slice(self2._offset, self2._offset + have);
          self2._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self2._offset >= self2._chunkSize) {
          availOutBefore = self2._chunkSize;
          self2._offset = 0;
          self2._buffer = Buffer.allocUnsafe(self2._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module.exports = exports = inflateSync;
    exports.Inflate = Inflate;
    exports.createInflate = createInflate;
    exports.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports, module) {
    "use strict";
    var SyncReader = module.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        throw new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        throw new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module.exports = function(buffer, options) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(
        bitmapData,
        metaData,
        options.skipRescale
      );
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var constants = require_constants();
    var Packer = require_packer();
    module.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options = opt || {};
      let packer = new Packer(options);
      let chunks = [];
      chunks.push(Buffer.from(constants.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports) {
    "use strict";
    var parse2 = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options) {
      return parse2(buffer, options || {});
    };
    exports.write = function(png, options) {
      return pack(png, options);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG2 = exports.PNG = function(options) {
      Stream.call(this);
      options = options || {};
      this.width = options.width | 0;
      this.height = options.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG2, Stream);
    PNG2.sync = PNGSync;
    PNG2.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG2.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG2.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG2.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG2.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG2.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG2.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG2.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG2.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG2.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG2.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i = 0; i < 3; i++) {
              let sample = src.data[idx + i] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG2.prototype.adjustGamma = function() {
      PNG2.adjustGamma(this);
    };
  }
});

// src/cli.ts
import { readFile as readFile8 } from "node:fs/promises";
import path12 from "node:path";
import { randomUUID as randomUUID8 } from "node:crypto";

// src/store.ts
import { mkdir, readFile, rename, writeFile, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID as randomUUID2 } from "node:crypto";

// src/core.ts
import { randomUUID } from "node:crypto";
var stages = ["egg", "hatchling", "juvenile", "adult"];
function text(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be nonempty text`);
  return value.trim();
}
function identifier(value, field = "id") {
  const result = text(value, field);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,199}$/.test(result)) throw new Error(`Invalid ${field}`);
  return result;
}
function createPet(name, now = Date.now()) {
  return {
    id: `genpet-${randomUUID()}`,
    name: name === void 0 ? "GenPet" : text(name, "name"),
    adoptedAt: now,
    revision: 0,
    naming: name === void 0 ? { status: "unasked" } : { status: "named", namedAt: now },
    genes: null,
    stage: "egg",
    state: { description: "", updatedAt: now }
  };
}
function validateStage(current, target2) {
  if (!stages.includes(target2)) throw new Error("Invalid stage");
  if (stages.indexOf(target2) < stages.indexOf(current)) throw new Error("Evolution cannot reverse the current stage");
  return target2;
}

// src/store.ts
var dataRoot = () => process.env.GENPET_DATA_DIR || path.join(homedir(), ".genpet");
var fresh = (host) => ({ version: 2, host, pet: null, stories: [], art: [], pending: null });
async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true, mode: 448 });
  const tmp = `${file}.${randomUUID2()}.tmp`;
  try {
    await writeFile(tmp, JSON.stringify(value, null, 2) + "\n", { mode: 384, flag: "wx" });
    await rename(tmp, file);
  } finally {
    await rm(tmp, { force: true });
  }
}
var Store = class {
  constructor(root = dataRoot(), demo2 = false, host = "desktop") {
    this.demo = demo2;
    this.host = host;
    this.base = path.resolve(root);
    this.root = path.resolve(this.base, host, ...demo2 ? ["demo"] : []);
    this.file = path.join(this.root, "state.json");
  }
  demo;
  host;
  base;
  root;
  file;
  now() {
    return Date.now();
  }
  async peek() {
    try {
      const state = JSON.parse(await readFile(this.file, "utf8"));
      if (state.version !== 2 || state.host !== this.host) throw new Error("Unsupported or mismatched pet record");
      if (state.pet) {
        identifier(state.pet.id, "petId");
        validateStage("egg", state.pet.stage);
        if (state.pet.personality !== void 0 && (typeof state.pet.personality !== "string" || !state.pet.personality.trim())) throw new Error("Invalid personality");
        if (state.pet.naming && !["unasked", "asked", "named", "deferred"].includes(state.pet.naming.status)) throw new Error("Invalid naming status");
      }
      return state;
    } catch (error) {
      if (error.code === "ENOENT") return fresh(this.host);
      throw error;
    }
  }
  /** Read-only; elapsed time never evolves a pet. */
  current() {
    return this.peek();
  }
  async legacyCandidate() {
    if (this.host !== "desktop" || this.demo) return null;
    const file = path.join(this.base, "state.json");
    try {
      const old = JSON.parse(await readFile(file, "utf8"));
      return old.version === 1 && old.pet ? file : null;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }
  async transaction(fn) {
    await mkdir(this.root, { recursive: true, mode: 448 });
    const lock = this.file + ".lock";
    let acquired = false;
    for (let i = 0; i < 100; i++) {
      try {
        await mkdir(lock);
        acquired = true;
        break;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const age = await stat(lock).then((info) => Date.now() - info.mtimeMs).catch(() => 0);
        if (age > 12e4) await rm(lock, { recursive: true, force: true });
        else await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    if (!acquired) throw new Error("Another pet operation is running; resume it before starting another");
    try {
      const state = await this.peek();
      const result = await fn(state);
      await atomicJson(this.file, state);
      if (state.pet) await atomicJson(path.join(this.root, "pets", state.pet.id, "record.json"), state);
      return result;
    } finally {
      await rm(lock, { recursive: true, force: true });
    }
  }
};

// src/art.ts
import { mkdir as mkdir2, readFile as readFile4, copyFile, writeFile as writeFile2, rename as rename2, stat as stat2 } from "node:fs/promises";
import path7 from "node:path";
import { createHash as createHash3, randomUUID as randomUUID6 } from "node:crypto";

// src/image.ts
var import_pngjs = __toESM(require_png(), 1);
import { readFile as readFile2 } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// node_modules/@jsquash/webp/codec/dec/webp_dec.js
var Module = (() => {
  var _scriptDir = import.meta.url;
  return (function(Module2 = {}) {
    var Module2 = typeof Module2 != "undefined" ? Module2 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module2["ready"] = new Promise(function(resolve, reject) {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    const isServiceWorker = globalThis.ServiceWorkerGlobalScope !== void 0;
    const isRunningInCloudFlareWorkers = isServiceWorker && typeof self !== "undefined" && globalThis.caches && globalThis.caches.default !== void 0;
    const isRunningInNode = typeof process === "object" && process.release && process.release.name === "node";
    if (isRunningInCloudFlareWorkers || isRunningInNode) {
      if (!globalThis.ImageData) {
        globalThis.ImageData = class ImageData {
          constructor(data, width, height) {
            this.data = data;
            this.width = width;
            this.height = height;
          }
        };
      }
      if (import.meta.url === void 0) {
        import.meta.url = "https://localhost";
      }
      if (typeof self !== "undefined" && self.location === void 0) {
        self.location = { href: "" };
      }
    }
    var moduleOverrides = Object.assign({}, Module2);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
    var scriptDirectory = "";
    function locateFile(path13) {
      if (Module2["locateFile"]) {
        return Module2["locateFile"](path13, scriptDirectory);
      }
      return scriptDirectory + path13;
    }
    var read_, readAsync, readBinary, setWindowTitle;
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      {
        read_ = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.send(null);
          return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
              onload(xhr.response);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
      setWindowTitle = (title) => document.title = title;
    } else {
    }
    var out = Module2["print"] || console.log.bind(console);
    var err = Module2["printErr"] || console.warn.bind(console);
    Object.assign(Module2, moduleOverrides);
    moduleOverrides = null;
    if (Module2["arguments"]) arguments_ = Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    if (Module2["quit"]) quit_ = Module2["quit"];
    var wasmBinary;
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    var noExitRuntime = Module2["noExitRuntime"] || true;
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var str = "";
      while (!(idx >= endIdx)) {
        var u0 = heapOrArray[idx++];
        if (!u0) return str;
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    function lengthBytesUTF8(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
        } else {
          len += 3;
        }
      }
      return len;
    }
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module2["HEAP8"] = HEAP8 = new Int8Array(b);
      Module2["HEAP16"] = HEAP16 = new Int16Array(b);
      Module2["HEAP32"] = HEAP32 = new Int32Array(b);
      Module2["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module2["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module2["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module2["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module2["HEAPF64"] = HEAPF64 = new Float64Array(b);
    }
    var wasmTable;
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function preRun() {
      if (Module2["preRun"]) {
        if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
        while (Module2["preRun"].length) {
          addOnPreRun(Module2["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      runtimeInitialized = true;
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
      if (Module2["postRun"]) {
        if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
        while (Module2["postRun"].length) {
          addOnPostRun(Module2["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module2["monitorRunDependencies"]) {
        Module2["monitorRunDependencies"](runDependencies);
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      if (Module2["onAbort"]) {
        Module2["onAbort"](what);
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    var wasmBinaryFile;
    if (Module2["locateFile"]) {
      wasmBinaryFile = "webp_dec.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("webp_dec.wasm", import.meta.url).href;
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise(binaryFile) {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function") {
          return fetch(binaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + binaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(binaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(binaryFile);
      });
    }
    function instantiateArrayBuffer(binaryFile, imports, receiver) {
      return getBinaryPromise(binaryFile).then(function(binary) {
        return WebAssembly.instantiate(binary, imports);
      }).then(function(instance) {
        return instance;
      }).then(receiver, function(reason) {
        err("failed to asynchronously prepare wasm: " + reason);
        abort(reason);
      });
    }
    function instantiateAsync(binary, binaryFile, imports, callback) {
      if (!binary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(binaryFile) && typeof fetch == "function") {
        return fetch(binaryFile, { credentials: "same-origin" }).then(function(response) {
          var result = WebAssembly.instantiateStreaming(response, imports);
          return result.then(callback, function(reason) {
            err("wasm streaming compile failed: " + reason);
            err("falling back to ArrayBuffer instantiation");
            return instantiateArrayBuffer(binaryFile, imports, callback);
          });
        });
      } else {
        return instantiateArrayBuffer(binaryFile, imports, callback);
      }
    }
    function createWasm() {
      var info = { "a": wasmImports };
      function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module2["asm"] = exports;
        wasmMemory = Module2["asm"]["s"];
        updateMemoryViews();
        wasmTable = Module2["asm"]["y"];
        addOnInit(Module2["asm"]["t"]);
        removeRunDependency("wasm-instantiate");
        return exports;
      }
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      if (Module2["instantiateWasm"]) {
        try {
          return Module2["instantiateWasm"](info, receiveInstance);
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync(wasmBinary, wasmBinaryFile, info, receiveInstantiationResult).catch(readyPromiseReject);
      return {};
    }
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module2);
      }
    }
    function ExceptionInfo(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
      this.set_type = function(type) {
        HEAPU32[this.ptr + 4 >> 2] = type;
      };
      this.get_type = function() {
        return HEAPU32[this.ptr + 4 >> 2];
      };
      this.set_destructor = function(destructor) {
        HEAPU32[this.ptr + 8 >> 2] = destructor;
      };
      this.get_destructor = function() {
        return HEAPU32[this.ptr + 8 >> 2];
      };
      this.set_refcount = function(refcount) {
        HEAP32[this.ptr >> 2] = refcount;
      };
      this.set_caught = function(caught) {
        caught = caught ? 1 : 0;
        HEAP8[this.ptr + 12 >> 0] = caught;
      };
      this.get_caught = function() {
        return HEAP8[this.ptr + 12 >> 0] != 0;
      };
      this.set_rethrown = function(rethrown) {
        rethrown = rethrown ? 1 : 0;
        HEAP8[this.ptr + 13 >> 0] = rethrown;
      };
      this.get_rethrown = function() {
        return HEAP8[this.ptr + 13 >> 0] != 0;
      };
      this.init = function(type, destructor) {
        this.set_adjusted_ptr(0);
        this.set_type(type);
        this.set_destructor(destructor);
        this.set_refcount(0);
        this.set_caught(false);
        this.set_rethrown(false);
      };
      this.add_ref = function() {
        var value = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = value + 1;
      };
      this.release_ref = function() {
        var prev = HEAP32[this.ptr >> 2];
        HEAP32[this.ptr >> 2] = prev - 1;
        return prev === 1;
      };
      this.set_adjusted_ptr = function(adjustedPtr) {
        HEAPU32[this.ptr + 16 >> 2] = adjustedPtr;
      };
      this.get_adjusted_ptr = function() {
        return HEAPU32[this.ptr + 16 >> 2];
      };
      this.get_exception_ptr = function() {
        var isPointer = ___cxa_is_pointer_type(this.get_type());
        if (isPointer) {
          return HEAPU32[this.excPtr >> 2];
        }
        var adjusted = this.get_adjusted_ptr();
        if (adjusted !== 0) return adjusted;
        return this.excPtr;
      };
    }
    var exceptionLast = 0;
    var uncaughtExceptionCount = 0;
    function ___cxa_throw(ptr, type, destructor) {
      var info = new ExceptionInfo(ptr);
      info.init(type, destructor);
      exceptionLast = ptr;
      uncaughtExceptionCount++;
      throw ptr;
    }
    function __embind_register_bigint(primitiveType, name, size, minRange, maxRange) {
    }
    function getShiftFromSize(size) {
      switch (size) {
        case 1:
          return 0;
        case 2:
          return 1;
        case 4:
          return 2;
        case 8:
          return 3;
        default:
          throw new TypeError("Unknown type size: " + size);
      }
    }
    function embind_init_charCodes() {
      var codes = new Array(256);
      for (var i = 0; i < 256; ++i) {
        codes[i] = String.fromCharCode(i);
      }
      embind_charCodes = codes;
    }
    var embind_charCodes = void 0;
    function readLatin1String(ptr) {
      var ret = "";
      var c = ptr;
      while (HEAPU8[c]) {
        ret += embind_charCodes[HEAPU8[c++]];
      }
      return ret;
    }
    var awaitingDependencies = {};
    var registeredTypes = {};
    var typeDependencies = {};
    var char_0 = 48;
    var char_9 = 57;
    function makeLegalFunctionName(name) {
      if (void 0 === name) {
        return "_unknown";
      }
      name = name.replace(/[^a-zA-Z0-9_]/g, "$");
      var f = name.charCodeAt(0);
      if (f >= char_0 && f <= char_9) {
        return "_" + name;
      }
      return name;
    }
    function createNamedFunction(name, body) {
      name = makeLegalFunctionName(name);
      return { [name]: function() {
        return body.apply(this, arguments);
      } }[name];
    }
    function extendError(baseErrorType, errorName) {
      var errorClass = createNamedFunction(errorName, function(message) {
        this.name = errorName;
        this.message = message;
        var stack = new Error(message).stack;
        if (stack !== void 0) {
          this.stack = this.toString() + "\n" + stack.replace(/^Error(:[^\n]*)?\n/, "");
        }
      });
      errorClass.prototype = Object.create(baseErrorType.prototype);
      errorClass.prototype.constructor = errorClass;
      errorClass.prototype.toString = function() {
        if (this.message === void 0) {
          return this.name;
        } else {
          return this.name + ": " + this.message;
        }
      };
      return errorClass;
    }
    var BindingError = void 0;
    function throwBindingError(message) {
      throw new BindingError(message);
    }
    var InternalError = void 0;
    function throwInternalError(message) {
      throw new InternalError(message);
    }
    function whenDependentTypesAreResolved(myTypes, dependentTypes, getTypeConverters) {
      myTypes.forEach(function(type) {
        typeDependencies[type] = dependentTypes;
      });
      function onComplete(typeConverters2) {
        var myTypeConverters = getTypeConverters(typeConverters2);
        if (myTypeConverters.length !== myTypes.length) {
          throwInternalError("Mismatched type converter count");
        }
        for (var i = 0; i < myTypes.length; ++i) {
          registerType(myTypes[i], myTypeConverters[i]);
        }
      }
      var typeConverters = new Array(dependentTypes.length);
      var unregisteredTypes = [];
      var registered = 0;
      dependentTypes.forEach((dt, i) => {
        if (registeredTypes.hasOwnProperty(dt)) {
          typeConverters[i] = registeredTypes[dt];
        } else {
          unregisteredTypes.push(dt);
          if (!awaitingDependencies.hasOwnProperty(dt)) {
            awaitingDependencies[dt] = [];
          }
          awaitingDependencies[dt].push(() => {
            typeConverters[i] = registeredTypes[dt];
            ++registered;
            if (registered === unregisteredTypes.length) {
              onComplete(typeConverters);
            }
          });
        }
      });
      if (0 === unregisteredTypes.length) {
        onComplete(typeConverters);
      }
    }
    function registerType(rawType, registeredInstance, options = {}) {
      if (!("argPackAdvance" in registeredInstance)) {
        throw new TypeError("registerType registeredInstance requires argPackAdvance");
      }
      var name = registeredInstance.name;
      if (!rawType) {
        throwBindingError('type "' + name + '" must have a positive integer typeid pointer');
      }
      if (registeredTypes.hasOwnProperty(rawType)) {
        if (options.ignoreDuplicateRegistrations) {
          return;
        } else {
          throwBindingError("Cannot register type '" + name + "' twice");
        }
      }
      registeredTypes[rawType] = registeredInstance;
      delete typeDependencies[rawType];
      if (awaitingDependencies.hasOwnProperty(rawType)) {
        var callbacks = awaitingDependencies[rawType];
        delete awaitingDependencies[rawType];
        callbacks.forEach((cb) => cb());
      }
    }
    function __embind_register_bool(rawType, name, size, trueValue, falseValue) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(wt) {
        return !!wt;
      }, "toWireType": function(destructors, o) {
        return o ? trueValue : falseValue;
      }, "argPackAdvance": 8, "readValueFromPointer": function(pointer) {
        var heap;
        if (size === 1) {
          heap = HEAP8;
        } else if (size === 2) {
          heap = HEAP16;
        } else if (size === 4) {
          heap = HEAP32;
        } else {
          throw new TypeError("Unknown boolean type size: " + name);
        }
        return this["fromWireType"](heap[pointer >> shift]);
      }, destructorFunction: null });
    }
    var emval_free_list = [];
    var emval_handle_array = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }];
    function __emval_decref(handle) {
      if (handle > 4 && 0 === --emval_handle_array[handle].refcount) {
        emval_handle_array[handle] = void 0;
        emval_free_list.push(handle);
      }
    }
    function count_emval_handles() {
      var count = 0;
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          ++count;
        }
      }
      return count;
    }
    function get_first_emval() {
      for (var i = 5; i < emval_handle_array.length; ++i) {
        if (emval_handle_array[i] !== void 0) {
          return emval_handle_array[i];
        }
      }
      return null;
    }
    function init_emval() {
      Module2["count_emval_handles"] = count_emval_handles;
      Module2["get_first_emval"] = get_first_emval;
    }
    var Emval = { toValue: (handle) => {
      if (!handle) {
        throwBindingError("Cannot use deleted val. handle = " + handle);
      }
      return emval_handle_array[handle].value;
    }, toHandle: (value) => {
      switch (value) {
        case void 0:
          return 1;
        case null:
          return 2;
        case true:
          return 3;
        case false:
          return 4;
        default: {
          var handle = emval_free_list.length ? emval_free_list.pop() : emval_handle_array.length;
          emval_handle_array[handle] = { refcount: 1, value };
          return handle;
        }
      }
    } };
    function simpleReadValueFromPointer(pointer) {
      return this["fromWireType"](HEAP32[pointer >> 2]);
    }
    function __embind_register_emval(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(handle) {
        var rv = Emval.toValue(handle);
        __emval_decref(handle);
        return rv;
      }, "toWireType": function(destructors, value) {
        return Emval.toHandle(value);
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: null });
    }
    function floatReadValueFromPointer(name, shift) {
      switch (shift) {
        case 2:
          return function(pointer) {
            return this["fromWireType"](HEAPF32[pointer >> 2]);
          };
        case 3:
          return function(pointer) {
            return this["fromWireType"](HEAPF64[pointer >> 3]);
          };
        default:
          throw new TypeError("Unknown float type: " + name);
      }
    }
    function __embind_register_float(rawType, name, size) {
      var shift = getShiftFromSize(size);
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": function(value) {
        return value;
      }, "toWireType": function(destructors, value) {
        return value;
      }, "argPackAdvance": 8, "readValueFromPointer": floatReadValueFromPointer(name, shift), destructorFunction: null });
    }
    function runDestructors(destructors) {
      while (destructors.length) {
        var ptr = destructors.pop();
        var del = destructors.pop();
        del(ptr);
      }
    }
    function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, isAsync) {
      var argCount = argTypes.length;
      if (argCount < 2) {
        throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
      }
      var isClassMethodFunc = argTypes[1] !== null && classType !== null;
      var needsDestructorStack = false;
      for (var i = 1; i < argTypes.length; ++i) {
        if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
          needsDestructorStack = true;
          break;
        }
      }
      var returns = argTypes[0].name !== "void";
      var expectedArgCount = argCount - 2;
      var argsWired = new Array(expectedArgCount);
      var invokerFuncArgs = [];
      var destructors = [];
      return function() {
        if (arguments.length !== expectedArgCount) {
          throwBindingError("function " + humanName + " called with " + arguments.length + " arguments, expected " + expectedArgCount + " args!");
        }
        destructors.length = 0;
        var thisWired;
        invokerFuncArgs.length = isClassMethodFunc ? 2 : 1;
        invokerFuncArgs[0] = cppTargetFunc;
        if (isClassMethodFunc) {
          thisWired = argTypes[1]["toWireType"](destructors, this);
          invokerFuncArgs[1] = thisWired;
        }
        for (var i2 = 0; i2 < expectedArgCount; ++i2) {
          argsWired[i2] = argTypes[i2 + 2]["toWireType"](destructors, arguments[i2]);
          invokerFuncArgs.push(argsWired[i2]);
        }
        var rv = cppInvokerFunc.apply(null, invokerFuncArgs);
        function onDone(rv2) {
          if (needsDestructorStack) {
            runDestructors(destructors);
          } else {
            for (var i3 = isClassMethodFunc ? 1 : 2; i3 < argTypes.length; i3++) {
              var param = i3 === 1 ? thisWired : argsWired[i3 - 2];
              if (argTypes[i3].destructorFunction !== null) {
                argTypes[i3].destructorFunction(param);
              }
            }
          }
          if (returns) {
            return argTypes[0]["fromWireType"](rv2);
          }
        }
        return onDone(rv);
      };
    }
    function ensureOverloadTable(proto, methodName, humanName) {
      if (void 0 === proto[methodName].overloadTable) {
        var prevFunc = proto[methodName];
        proto[methodName] = function() {
          if (!proto[methodName].overloadTable.hasOwnProperty(arguments.length)) {
            throwBindingError("Function '" + humanName + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + proto[methodName].overloadTable + ")!");
          }
          return proto[methodName].overloadTable[arguments.length].apply(this, arguments);
        };
        proto[methodName].overloadTable = [];
        proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
      }
    }
    function exposePublicSymbol(name, value, numArguments) {
      if (Module2.hasOwnProperty(name)) {
        if (void 0 === numArguments || void 0 !== Module2[name].overloadTable && void 0 !== Module2[name].overloadTable[numArguments]) {
          throwBindingError("Cannot register public name '" + name + "' twice");
        }
        ensureOverloadTable(Module2, name, name);
        if (Module2.hasOwnProperty(numArguments)) {
          throwBindingError("Cannot register multiple overloads of a function with the same number of arguments (" + numArguments + ")!");
        }
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        if (void 0 !== numArguments) {
          Module2[name].numArguments = numArguments;
        }
      }
    }
    function heap32VectorToArray(count, firstElement) {
      var array = [];
      for (var i = 0; i < count; i++) {
        array.push(HEAPU32[firstElement + i * 4 >> 2]);
      }
      return array;
    }
    function replacePublicSymbol(name, value, numArguments) {
      if (!Module2.hasOwnProperty(name)) {
        throwInternalError("Replacing nonexistant public symbol");
      }
      if (void 0 !== Module2[name].overloadTable && void 0 !== numArguments) {
        Module2[name].overloadTable[numArguments] = value;
      } else {
        Module2[name] = value;
        Module2[name].argCount = numArguments;
      }
    }
    function dynCallLegacy(sig, ptr, args2) {
      var f = Module2["dynCall_" + sig];
      return args2 && args2.length ? f.apply(null, [ptr].concat(args2)) : f.call(null, ptr);
    }
    var wasmTableMirror = [];
    function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      return func;
    }
    function dynCall(sig, ptr, args2) {
      if (sig.includes("j")) {
        return dynCallLegacy(sig, ptr, args2);
      }
      var rtn = getWasmTableEntry(ptr).apply(null, args2);
      return rtn;
    }
    function getDynCaller(sig, ptr) {
      var argCache = [];
      return function() {
        argCache.length = 0;
        Object.assign(argCache, arguments);
        return dynCall(sig, ptr, argCache);
      };
    }
    function embind__requireFunction(signature, rawFunction) {
      signature = readLatin1String(signature);
      function makeDynCaller() {
        if (signature.includes("j")) {
          return getDynCaller(signature, rawFunction);
        }
        return getWasmTableEntry(rawFunction);
      }
      var fp = makeDynCaller();
      if (typeof fp != "function") {
        throwBindingError("unknown function pointer with signature " + signature + ": " + rawFunction);
      }
      return fp;
    }
    var UnboundTypeError = void 0;
    function getTypeName(type) {
      var ptr = ___getTypeName(type);
      var rv = readLatin1String(ptr);
      _free(ptr);
      return rv;
    }
    function throwUnboundTypeError(message, types) {
      var unboundTypes = [];
      var seen = {};
      function visit(type) {
        if (seen[type]) {
          return;
        }
        if (registeredTypes[type]) {
          return;
        }
        if (typeDependencies[type]) {
          typeDependencies[type].forEach(visit);
          return;
        }
        unboundTypes.push(type);
        seen[type] = true;
      }
      types.forEach(visit);
      throw new UnboundTypeError(message + ": " + unboundTypes.map(getTypeName).join([", "]));
    }
    function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync) {
      var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
      name = readLatin1String(name);
      rawInvoker = embind__requireFunction(signature, rawInvoker);
      exposePublicSymbol(name, function() {
        throwUnboundTypeError("Cannot call " + name + " due to unbound types", argTypes);
      }, argCount - 1);
      whenDependentTypesAreResolved([], argTypes, function(argTypes2) {
        var invokerArgsArray = [argTypes2[0], null].concat(argTypes2.slice(1));
        replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn, isAsync), argCount - 1);
        return [];
      });
    }
    function integerReadValueFromPointer(name, shift, signed) {
      switch (shift) {
        case 0:
          return signed ? function readS8FromPointer(pointer) {
            return HEAP8[pointer];
          } : function readU8FromPointer(pointer) {
            return HEAPU8[pointer];
          };
        case 1:
          return signed ? function readS16FromPointer(pointer) {
            return HEAP16[pointer >> 1];
          } : function readU16FromPointer(pointer) {
            return HEAPU16[pointer >> 1];
          };
        case 2:
          return signed ? function readS32FromPointer(pointer) {
            return HEAP32[pointer >> 2];
          } : function readU32FromPointer(pointer) {
            return HEAPU32[pointer >> 2];
          };
        default:
          throw new TypeError("Unknown integer type: " + name);
      }
    }
    function __embind_register_integer(primitiveType, name, size, minRange, maxRange) {
      name = readLatin1String(name);
      if (maxRange === -1) {
        maxRange = 4294967295;
      }
      var shift = getShiftFromSize(size);
      var fromWireType = (value) => value;
      if (minRange === 0) {
        var bitshift = 32 - 8 * size;
        fromWireType = (value) => value << bitshift >>> bitshift;
      }
      var isUnsignedType = name.includes("unsigned");
      var checkAssertions = (value, toTypeName) => {
      };
      var toWireType;
      if (isUnsignedType) {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value >>> 0;
        };
      } else {
        toWireType = function(destructors, value) {
          checkAssertions(value, this.name);
          return value;
        };
      }
      registerType(primitiveType, { name, "fromWireType": fromWireType, "toWireType": toWireType, "argPackAdvance": 8, "readValueFromPointer": integerReadValueFromPointer(name, shift, minRange !== 0), destructorFunction: null });
    }
    function __embind_register_memory_view(rawType, dataTypeIndex, name) {
      var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
      var TA = typeMapping[dataTypeIndex];
      function decodeMemoryView(handle) {
        handle = handle >> 2;
        var heap = HEAPU32;
        var size = heap[handle];
        var data = heap[handle + 1];
        return new TA(heap.buffer, data, size);
      }
      name = readLatin1String(name);
      registerType(rawType, { name, "fromWireType": decodeMemoryView, "argPackAdvance": 8, "readValueFromPointer": decodeMemoryView }, { ignoreDuplicateRegistrations: true });
    }
    function __embind_register_std_string(rawType, name) {
      name = readLatin1String(name);
      var stdStringIsUTF8 = name === "std::string";
      registerType(rawType, { name, "fromWireType": function(value) {
        var length = HEAPU32[value >> 2];
        var payload = value + 4;
        var str;
        if (stdStringIsUTF8) {
          var decodeStartPtr = payload;
          for (var i = 0; i <= length; ++i) {
            var currentBytePtr = payload + i;
            if (i == length || HEAPU8[currentBytePtr] == 0) {
              var maxRead = currentBytePtr - decodeStartPtr;
              var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
              if (str === void 0) {
                str = stringSegment;
              } else {
                str += String.fromCharCode(0);
                str += stringSegment;
              }
              decodeStartPtr = currentBytePtr + 1;
            }
          }
        } else {
          var a = new Array(length);
          for (var i = 0; i < length; ++i) {
            a[i] = String.fromCharCode(HEAPU8[payload + i]);
          }
          str = a.join("");
        }
        _free(value);
        return str;
      }, "toWireType": function(destructors, value) {
        if (value instanceof ArrayBuffer) {
          value = new Uint8Array(value);
        }
        var length;
        var valueIsOfTypeString = typeof value == "string";
        if (!(valueIsOfTypeString || value instanceof Uint8Array || value instanceof Uint8ClampedArray || value instanceof Int8Array)) {
          throwBindingError("Cannot pass non-string to std::string");
        }
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          length = lengthBytesUTF8(value);
        } else {
          length = value.length;
        }
        var base = _malloc(4 + length + 1);
        var ptr = base + 4;
        HEAPU32[base >> 2] = length;
        if (stdStringIsUTF8 && valueIsOfTypeString) {
          stringToUTF8(value, ptr, length + 1);
        } else {
          if (valueIsOfTypeString) {
            for (var i = 0; i < length; ++i) {
              var charCode = value.charCodeAt(i);
              if (charCode > 255) {
                _free(ptr);
                throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
              }
              HEAPU8[ptr + i] = charCode;
            }
          } else {
            for (var i = 0; i < length; ++i) {
              HEAPU8[ptr + i] = value[i];
            }
          }
        }
        if (destructors !== null) {
          destructors.push(_free, base);
        }
        return base;
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      } });
    }
    function UTF16ToString(ptr, maxBytesToRead) {
      var str = "";
      for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
        var codeUnit = HEAP16[ptr + i * 2 >> 1];
        if (codeUnit == 0) break;
        str += String.fromCharCode(codeUnit);
      }
      return str;
    }
    function stringToUTF16(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2;
      }
      HEAP16[outPtr >> 1] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF16(str) {
      return str.length * 2;
    }
    function UTF32ToString(ptr, maxBytesToRead) {
      var i = 0;
      var str = "";
      while (!(i >= maxBytesToRead / 4)) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0) break;
        ++i;
        if (utf32 >= 65536) {
          var ch = utf32 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        } else {
          str += String.fromCharCode(utf32);
        }
      }
      return str;
    }
    function stringToUTF32(str, outPtr, maxBytesToWrite) {
      if (maxBytesToWrite === void 0) {
        maxBytesToWrite = 2147483647;
      }
      if (maxBytesToWrite < 4) return 0;
      var startPtr = outPtr;
      var endPtr = startPtr + maxBytesToWrite - 4;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
          var trailSurrogate = str.charCodeAt(++i);
          codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr) break;
      }
      HEAP32[outPtr >> 2] = 0;
      return outPtr - startPtr;
    }
    function lengthBytesUTF32(str) {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
        len += 4;
      }
      return len;
    }
    function __embind_register_std_wstring(rawType, charSize, name) {
      name = readLatin1String(name);
      var decodeString, encodeString, getHeap, lengthBytesUTF, shift;
      if (charSize === 2) {
        decodeString = UTF16ToString;
        encodeString = stringToUTF16;
        lengthBytesUTF = lengthBytesUTF16;
        getHeap = () => HEAPU16;
        shift = 1;
      } else if (charSize === 4) {
        decodeString = UTF32ToString;
        encodeString = stringToUTF32;
        lengthBytesUTF = lengthBytesUTF32;
        getHeap = () => HEAPU32;
        shift = 2;
      }
      registerType(rawType, { name, "fromWireType": function(value) {
        var length = HEAPU32[value >> 2];
        var HEAP = getHeap();
        var str;
        var decodeStartPtr = value + 4;
        for (var i = 0; i <= length; ++i) {
          var currentBytePtr = value + 4 + i * charSize;
          if (i == length || HEAP[currentBytePtr >> shift] == 0) {
            var maxReadBytes = currentBytePtr - decodeStartPtr;
            var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
            if (str === void 0) {
              str = stringSegment;
            } else {
              str += String.fromCharCode(0);
              str += stringSegment;
            }
            decodeStartPtr = currentBytePtr + charSize;
          }
        }
        _free(value);
        return str;
      }, "toWireType": function(destructors, value) {
        if (!(typeof value == "string")) {
          throwBindingError("Cannot pass non-string to C++ string type " + name);
        }
        var length = lengthBytesUTF(value);
        var ptr = _malloc(4 + length + charSize);
        HEAPU32[ptr >> 2] = length >> shift;
        encodeString(value, ptr + 4, length + charSize);
        if (destructors !== null) {
          destructors.push(_free, ptr);
        }
        return ptr;
      }, "argPackAdvance": 8, "readValueFromPointer": simpleReadValueFromPointer, destructorFunction: function(ptr) {
        _free(ptr);
      } });
    }
    function __embind_register_void(rawType, name) {
      name = readLatin1String(name);
      registerType(rawType, { isVoid: true, name, "argPackAdvance": 0, "fromWireType": function() {
        return void 0;
      }, "toWireType": function(destructors, o) {
        return void 0;
      } });
    }
    var emval_symbols = {};
    function getStringOrSymbol(address) {
      var symbol = emval_symbols[address];
      if (symbol === void 0) {
        return readLatin1String(address);
      }
      return symbol;
    }
    function emval_get_global() {
      if (typeof globalThis == "object") {
        return globalThis;
      }
      function testGlobal(obj) {
        obj["$$$embind_global$$$"] = obj;
        var success = typeof $$$embind_global$$$ == "object" && obj["$$$embind_global$$$"] == obj;
        if (!success) {
          delete obj["$$$embind_global$$$"];
        }
        return success;
      }
      if (typeof $$$embind_global$$$ == "object") {
        return $$$embind_global$$$;
      }
      if (typeof global == "object" && testGlobal(global)) {
        $$$embind_global$$$ = global;
      } else if (typeof self == "object" && testGlobal(self)) {
        $$$embind_global$$$ = self;
      }
      if (typeof $$$embind_global$$$ == "object") {
        return $$$embind_global$$$;
      }
      throw Error("unable to get global object.");
    }
    function __emval_get_global(name) {
      if (name === 0) {
        return Emval.toHandle(emval_get_global());
      } else {
        name = getStringOrSymbol(name);
        return Emval.toHandle(emval_get_global()[name]);
      }
    }
    function __emval_incref(handle) {
      if (handle > 4) {
        emval_handle_array[handle].refcount += 1;
      }
    }
    function requireRegisteredType(rawType, humanName) {
      var impl = registeredTypes[rawType];
      if (void 0 === impl) {
        throwBindingError(humanName + " has unknown type " + getTypeName(rawType));
      }
      return impl;
    }
    function craftEmvalAllocator(argCount) {
      var argsList = new Array(argCount + 1);
      return function(constructor, argTypes, args2) {
        argsList[0] = constructor;
        for (var i = 0; i < argCount; ++i) {
          var argType = requireRegisteredType(HEAPU32[argTypes + i * 4 >> 2], "parameter " + i);
          argsList[i + 1] = argType["readValueFromPointer"](args2);
          args2 += argType["argPackAdvance"];
        }
        var obj = new (constructor.bind.apply(constructor, argsList))();
        return Emval.toHandle(obj);
      };
    }
    var emval_newers = {};
    function __emval_new(handle, argCount, argTypes, args2) {
      handle = Emval.toValue(handle);
      var newer = emval_newers[argCount];
      if (!newer) {
        newer = craftEmvalAllocator(argCount);
        emval_newers[argCount] = newer;
      }
      return newer(handle, argTypes, args2);
    }
    function _abort() {
      abort("");
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function getHeapMax() {
      return 2147483648;
    }
    function emscripten_realloc_buffer(size) {
      var b = wasmMemory.buffer;
      try {
        wasmMemory.grow(size - b.byteLength + 65535 >>> 16);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }
    embind_init_charCodes();
    BindingError = Module2["BindingError"] = extendError(Error, "BindingError");
    InternalError = Module2["InternalError"] = extendError(Error, "InternalError");
    init_emval();
    UnboundTypeError = Module2["UnboundTypeError"] = extendError(Error, "UnboundTypeError");
    var wasmImports = { "n": ___cxa_throw, "o": __embind_register_bigint, "l": __embind_register_bool, "r": __embind_register_emval, "k": __embind_register_float, "c": __embind_register_function, "b": __embind_register_integer, "a": __embind_register_memory_view, "g": __embind_register_std_string, "f": __embind_register_std_wstring, "m": __embind_register_void, "d": __emval_decref, "e": __emval_get_global, "i": __emval_incref, "h": __emval_new, "j": _abort, "q": _emscripten_memcpy_big, "p": _emscripten_resize_heap };
    var asm = createWasm();
    var ___wasm_call_ctors = function() {
      return (___wasm_call_ctors = Module2["asm"]["t"]).apply(null, arguments);
    };
    var _malloc = function() {
      return (_malloc = Module2["asm"]["u"]).apply(null, arguments);
    };
    var _free = function() {
      return (_free = Module2["asm"]["v"]).apply(null, arguments);
    };
    var ___getTypeName = Module2["___getTypeName"] = function() {
      return (___getTypeName = Module2["___getTypeName"] = Module2["asm"]["w"]).apply(null, arguments);
    };
    var __embind_initialize_bindings = Module2["__embind_initialize_bindings"] = function() {
      return (__embind_initialize_bindings = Module2["__embind_initialize_bindings"] = Module2["asm"]["x"]).apply(null, arguments);
    };
    var ___errno_location = function() {
      return (___errno_location = Module2["asm"]["__errno_location"]).apply(null, arguments);
    };
    var ___cxa_is_pointer_type = function() {
      return (___cxa_is_pointer_type = Module2["asm"]["z"]).apply(null, arguments);
    };
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function run() {
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module2["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module2);
        if (Module2["onRuntimeInitialized"]) Module2["onRuntimeInitialized"]();
        postRun();
      }
      if (Module2["setStatus"]) {
        Module2["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module2["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].pop()();
      }
    }
    run();
    return Module2.ready;
  });
})();
var webp_dec_default = Module;

// node_modules/@jsquash/webp/utils.js
function initEmscriptenModule(moduleFactory, wasmModule, moduleOptionOverrides = {}) {
  let instantiateWasm;
  if (wasmModule) {
    instantiateWasm = (imports, callback) => {
      const instance = new WebAssembly.Instance(wasmModule, imports);
      callback(instance);
      return instance.exports;
    };
  }
  return moduleFactory({
    // Just to be safe, don't automatically invoke any wasm functions
    noInitialRun: true,
    instantiateWasm,
    ...moduleOptionOverrides
  });
}

// node_modules/@jsquash/webp/decode.js
var emscriptenModule;
async function init(module, moduleOptionOverrides) {
  let actualModule = module;
  let actualOptions = moduleOptionOverrides;
  if (arguments.length === 1 && !(module instanceof WebAssembly.Module)) {
    actualModule = void 0;
    actualOptions = module;
  }
  emscriptenModule = initEmscriptenModule(webp_dec_default, actualModule, actualOptions);
}
async function decode(buffer) {
  if (!emscriptenModule)
    init();
  const module = await emscriptenModule;
  const result = module.decode(buffer);
  if (!result)
    throw new Error("Decoding error");
  return result;
}

// src/image.ts
function imageInfo(buf) {
  if (buf.length >= 33 && buf.readUInt32BE(0) === 2303741511 && buf.toString("ascii", 12, 16) === "IHDR") {
    const colorType = buf[25];
    let hasAlpha = colorType === 4 || colorType === 6;
    for (let at = 8; !hasAlpha && at + 8 <= buf.length; ) {
      const type = buf.toString("ascii", at + 4, at + 8);
      if (type === "tRNS") hasAlpha = true;
      if (type === "IDAT" || type === "IEND") break;
      at += 12 + buf.readUInt32BE(at);
    }
    return { format: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), hasAlpha };
  }
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { format: "webp", width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), hasAlpha: (buf[20] & 16) !== 0 };
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { format: "webp", width: 1 + (bits & 16383), height: 1 + (bits >>> 14 & 16383), hasAlpha: (bits >>> 28 & 1) === 1 };
    }
    if (chunk === "VP8 ") return { format: "webp", width: buf.readUInt16LE(26) & 16383, height: buf.readUInt16LE(28) & 16383, hasAlpha: false };
  }
  throw new Error("Use a PNG or WebP image");
}
async function readImageInfo(file) {
  return imageInfo(await readFile2(file));
}
var webpReady;
function webpWasm() {
  const bundled = fileURLToPath(new URL("./webp_dec.wasm", import.meta.url));
  return existsSync(bundled) ? bundled : createRequire(import.meta.url).resolve("@jsquash/webp/codec/dec/webp_dec.wasm");
}
async function decodeRgba(file) {
  const buf = await readFile2(file);
  const info = imageInfo(buf);
  if (info.format === "png") return { ...info, data: import_pngjs.PNG.sync.read(buf).data };
  globalThis.ImageData ??= class {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
    data;
    width;
    height;
  };
  webpReady ??= WebAssembly.compile(readFileSync(webpWasm())).then((module) => init(module));
  await webpReady;
  const decoded = await decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  return { ...info, data: new Uint8Array(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength) };
}

// src/story.ts
import { randomUUID as randomUUID3, createHash } from "node:crypto";
import { access } from "node:fs/promises";
import path2 from "node:path";
function pendingFor(state, id) {
  const pending = state.pending;
  if (!pending || pending.id !== id || !state.pet || pending.petId !== state.pet.id || pending.baseRevision !== state.pet.revision)
    throw new Error("Stale story operation; read the persisted record before continuing");
  return pending;
}
async function beginStory(store2, triggerId, mode = "story", name) {
  identifier(triggerId, "triggerId");
  if (!["initialization", "story", "grow"].includes(mode)) throw new Error("Invalid story mode");
  return store2.transaction(async (state) => {
    const completed = state.stories.find((story) => story.triggerId === triggerId);
    if (completed) return { status: "completed", story: completed };
    if (state.pending) {
      if (state.pending.triggerId !== triggerId) throw new Error(`Unfinished story ${state.pending.id}; resume it first`);
      return { status: "pending", pending: state.pending, pet: state.pet };
    }
    if (!state.pet && await store2.legacyCandidate()) throw new Error("Existing legacy pet found; migrate it before creating a new identity");
    state.pet ??= createPet(name);
    state.pending = {
      id: `story-${randomUUID3()}`,
      triggerId,
      petId: state.pet.id,
      baseRevision: state.pet.revision,
      startedAt: Date.now(),
      mode: state.pet.genes ? mode : "initialization"
    };
    return { status: "pending", pending: state.pending, pet: state.pet };
  });
}
async function resetPet(store2, operationId) {
  const triggerId = `reset:${identifier(operationId, "reset operationId")}`;
  return store2.transaction(async (state) => {
    const completed = state.stories.find((story) => story.triggerId === triggerId);
    if (completed) return { status: "completed", story: completed };
    if (state.pending?.triggerId === triggerId) return { status: "pending", pending: state.pending, pet: state.pet };
    if (state.pending) throw new Error("Resume or cancel the unfinished story before an explicit reset");
    if (!state.pet && await store2.legacyCandidate()) throw new Error("Migrate the existing legacy pet before resetting its identity");
    const backup = path2.join(store2.root, "backups", `reset-${Date.now()}-${randomUUID3()}.json`);
    await atomicJson(backup, state);
    const previous = state.pet, binding = previous?.binding, schedule = state.schedule;
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, fresh(store2.host), { pet: createPet(), ...schedule ? { schedule } : {} });
    if (binding) state.pet.binding = binding;
    if (previous) state.replacesPetId = previous.id;
    state.pending = {
      id: `story-${randomUUID3()}`,
      petId: state.pet.id,
      triggerId,
      baseRevision: 0,
      startedAt: Date.now(),
      mode: "initialization"
    };
    return { status: "pending", pending: state.pending, pet: state.pet, backup };
  });
}
function appearanceFor(state, stage, id) {
  const kind = state.host === "desktop" ? "atlas" : "avatar";
  const art = state.art.find((art2) => art2.id === id && art2.petId === state.pet.id && art2.kind === kind && art2.stage === stage);
  if (!art) throw new Error("Reusable appearance is missing, belongs to another pet, or is incompatible with this host/stage");
  return art;
}
function validatePlan(state, input) {
  const pet = state.pet;
  const plan = { text: text(input.text, "story text"), basis: text(input.basis, "decision basis"), state: text(input.state, "state") };
  plan.stage = validateStage(pet.stage, input.stage ?? pet.stage);
  if (input.personality !== void 0) {
    plan.personality = text(input.personality, "personality");
    if (pet.personality && pet.personality !== plan.personality) throw new Error("An existing pet retains its personality");
  } else if (pet.personality) plan.personality = pet.personality;
  if (!pet.genes) {
    if (plan.stage !== "egg") throw new Error("Initialization begins with an egg");
    plan.genes = text(input.genes, "open gene description");
    plan.place = text(input.place, "acquisition place");
    plan.connection = text(input.connection, "user connection");
    if (!plan.personality) throw new Error("Initialization requires an individual personality");
    if (!input.appearance) throw new Error("Initialization requires an egg appearance");
  } else if (input.genes !== void 0 && input.genes !== pet.genes) throw new Error("An existing pet retains its genes");
  if (input.appearance) plan.appearance = {
    description: text(input.appearance.description, "appearance description"),
    ...input.appearance.reuseArtId ? { reuseArtId: identifier(input.appearance.reuseArtId, "reuseArtId") } : {}
  };
  if (plan.stage !== pet.stage && !plan.appearance) throw new Error("Evolution requires an appearance for the new stage");
  if (input.mediaIds !== void 0) {
    if (!Array.isArray(input.mediaIds)) throw new Error("mediaIds must be an array");
    plan.mediaIds = input.mediaIds.map((id) => identifier(id, "mediaId"));
    for (const id of plan.mediaIds) if (!state.art.some((art) => art.id === id && art.petId === pet.id)) throw new Error("Media belongs to another pet or is missing");
  }
  if (plan.appearance?.reuseArtId) appearanceFor(state, plan.stage, plan.appearance.reuseArtId);
  return plan;
}
async function planStory(store2, id, input) {
  return store2.transaction((state) => {
    const pending = pendingFor(state, id);
    if (pending.plan && JSON.stringify(input) === JSON.stringify(pending.plan)) return pending;
    const plan = validatePlan(state, input);
    if (pending.plan && JSON.stringify(pending.plan) !== JSON.stringify(plan)) throw new Error("The story plan is saved; resume it or cancel explicitly before redesigning");
    pending.plan = plan;
    return pending;
  });
}
function requestId(state) {
  const pending = state.pending;
  return pending?.plan ? createHash("sha256").update(JSON.stringify([pending.id, pending.petId, pending.baseRevision, pending.plan])).digest("hex").slice(0, 24) : null;
}
function desiredAppearance(state) {
  const plan = state.pending?.plan;
  if (!plan?.appearance) return state.art.find((art) => art.id === state.pet?.state.appearanceId);
  if (plan.appearance.reuseArtId) return appearanceFor(state, plan.stage, plan.appearance.reuseArtId);
  const kind = state.host === "desktop" ? "atlas" : "avatar";
  return [...state.art].reverse().find((art) => art.petId === state.pet?.id && art.requestId === requestId(state) && art.kind === kind);
}
function validateHostResult(state, id, input) {
  const pending = pendingFor(state, id);
  if (state.host === "dots" && !state.pet?.binding) throw new Error("Bind the actual Dots Avatar before recording an update");
  if (input.petId !== pending.petId || input.operationId !== id) throw new Error("Host result belongs to another pet or operation");
  if (input.appearanceId !== desiredAppearance(state)?.id) throw new Error("Host result belongs to a different appearance");
  const avatarId = text(input.avatarId, "avatarId");
  if (state.pet?.binding && state.pet.binding.avatarId !== avatarId) throw new Error("Host updated a different Avatar from the persisted target");
  if (typeof input.updated !== "boolean" || ![true, false, null].includes(input.active) || typeof input.refreshRequested !== "boolean" || !["confirmed", "unconfirmed"].includes(input.displayStatus)) throw new Error("Invalid host result");
  if (input.displayStatus === "confirmed" && !input.evidence?.trim()) throw new Error("Confirmed display requires evidence");
  return {
    petId: input.petId,
    operationId: id,
    appearanceId: input.appearanceId,
    avatarId,
    updated: input.updated,
    active: input.active,
    refreshRequested: input.refreshRequested,
    displayStatus: input.displayStatus,
    ...input.evidence ? { evidence: text(input.evidence, "evidence") } : {},
    ...input.error ? { error: text(input.error, "error") } : {}
  };
}
async function recordHostResult(store2, id, input) {
  if (store2.demo) throw new Error("Demo records cannot update a host Avatar");
  return store2.transaction((state) => {
    const pending = pendingFor(state, id);
    if (!pending.plan?.appearance) throw new Error("No planned appearance update");
    if (!desiredAppearance(state)) throw new Error("Complete or select appearance artwork first");
    const result = validateHostResult(state, id, input);
    if (result.updated) state.pet.binding ??= { host: state.host, avatarId: result.avatarId };
    pending.hostResult = result;
    return result;
  });
}
async function finishStory(store2, id) {
  return store2.transaction(async (state) => {
    const previous = state.stories.find((story2) => story2.id === id);
    if (previous) return previous;
    const pending = pendingFor(state, id), plan = pending.plan;
    if (!plan) throw new Error("Save a story plan before completing it");
    const pet = state.pet, appearance = desiredAppearance(state);
    if (plan.appearance) {
      if (!appearance) throw new Error("Appearance artwork is unfinished");
      await access(appearance.file);
      if (!store2.demo) {
        const result = pending.hostResult;
        if (!result?.updated || result.appearanceId !== appearance.id || result.error || result.active !== false && !result.refreshRequested && result.displayStatus !== "confirmed")
          throw new Error("Host update or active Avatar refresh is unfinished; resume it");
      }
    }
    const mediaIds = [.../* @__PURE__ */ new Set([...plan.mediaIds ?? [], ...state.art.filter((art) => art.requestId === requestId(state) && ["story", "artifact"].includes(art.kind)).map((art) => art.id)])];
    for (const mediaId of mediaIds) await access(state.art.find((art) => art.id === mediaId && art.petId === pet.id).file);
    const story = {
      id,
      triggerId: pending.triggerId,
      petId: pet.id,
      at: Date.now(),
      text: plan.text,
      basis: plan.basis,
      stage: plan.stage,
      state: plan.state,
      ...appearance ? { appearanceId: appearance.id } : {},
      mediaIds,
      ...pending.steps?.length ? { steps: pending.steps } : {},
      ...pending.hostResult ? { hostResult: pending.hostResult } : {}
    };
    if (!pet.genes) {
      pet.genes = plan.genes;
      pet.acquisition = { place: plan.place, connection: plan.connection, storyId: id };
    }
    if (plan.personality) pet.personality ??= plan.personality;
    pet.stage = plan.stage;
    pet.revision++;
    pet.state = {
      description: plan.state,
      storyId: id,
      updatedAt: story.at,
      ...appearance ? { appearanceId: appearance.id } : {}
    };
    state.stories.push(story);
    state.pending = null;
    return story;
  });
}
function dueStory(state, now = Date.now(), timezone = state.schedule?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (key) => parts.find((part) => part.type === key).value;
  const date = `${get("year")}-${get("month")}-${get("day")}`, time = `${get("hour")}:${get("minute")}`;
  const times = state.schedule?.times ?? ["07:00", "12:00", "16:00", "21:00"], slot = times.filter((slot2) => slot2 <= time).at(-1);
  const triggerId = slot ? `daily:${date}:${slot}:${timezone.replace(/\//g, ".")}` : null;
  return { timezone, times, triggerId, due: !!triggerId && !state.stories.some((story) => story.triggerId === triggerId), pending: state.pending?.id ?? null };
}

// src/native-ipc.ts
import net from "node:net";
import { lstat } from "node:fs/promises";
import { randomUUID as randomUUID4 } from "node:crypto";
import path3 from "node:path";
import { homedir as homedir2 } from "node:os";
function desktopIpcPath() {
  return process.platform === "win32" ? "\\\\.\\pipe\\codex-ipc" : path3.join(process.env.CODEX_HOME || path3.join(homedir2(), ".codex"), "ipc", "ipc.sock");
}
async function refreshViaIpc(socketPath = desktopIpcPath(), timeoutMs = 2e3) {
  if (process.platform === "win32") {
    if (!socketPath.startsWith("\\\\.\\pipe\\")) throw Error("Expected a local Windows named pipe");
  } else {
    const [file, directory] = await Promise.all([lstat(socketPath), lstat(path3.dirname(socketPath))]);
    const uid = process.getuid?.();
    if (uid == null || file.uid !== uid || directory.uid !== uid || !file.isSocket() || !directory.isDirectory() || directory.mode & 18) {
      throw Error("IPC socket must belong to the current user in a protected directory");
    }
  }
  const sockets = /* @__PURE__ */ new Set();
  const pending = /* @__PURE__ */ new Set();
  let failure;
  const fail = (error) => {
    failure ??= error;
    for (const reject of [...pending]) reject(error);
  };
  const deadline = setTimeout(() => fail(Error("IPC refresh timed out")), timeoutMs);
  function connect() {
    return new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      pending.add(reject);
      const socket = net.createConnection(socketPath);
      sockets.add(socket);
      const requestId2 = randomUUID4();
      let buffer = Buffer.alloc(0);
      let listener;
      const send = (message) => {
        if (failure) throw failure;
        const body = Buffer.from(JSON.stringify(message));
        const header = Buffer.alloc(4);
        header.writeUInt32LE(body.length);
        socket.write(Buffer.concat([header, body]));
      };
      socket.on("error", fail);
      socket.on("close", () => fail(Error("IPC connection closed")));
      socket.on("connect", () => send({ type: "request", requestId: requestId2, sourceClientId: "genpet", version: 0, method: "initialize", params: { clientType: "genpet" } }));
      socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 4) {
          const length = buffer.readUInt32LE(0);
          if (length > 16 * 1024 * 1024) {
            fail(Error("IPC frame too large"));
            return;
          }
          if (buffer.length < length + 4) return;
          let message;
          try {
            message = JSON.parse(buffer.subarray(4, length + 4).toString());
          } catch {
            fail(Error("Invalid IPC JSON"));
            return;
          }
          buffer = buffer.subarray(length + 4);
          if (!message || typeof message !== "object") {
            fail(Error("Invalid IPC message"));
            return;
          }
          if (message.type === "response" && message.requestId === requestId2) {
            if (message.resultType !== "success" || typeof message.result?.clientId !== "string") {
              fail(Error("IPC initialization rejected"));
              return;
            }
            pending.delete(reject);
            resolve({ id: message.result.clientId, send, onMessage: (fn) => {
              listener = fn;
            } });
          }
          listener?.(message);
        }
      });
    });
  }
  try {
    const observer = await connect();
    const sender = await connect();
    await new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      pending.add(reject);
      observer.onMessage((message) => {
        if (message.type === "broadcast" && message.method === "query-cache-invalidate" && message.version === 0 && message.sourceClientId === sender.id && JSON.stringify(message.params) === JSON.stringify({ queryKey: ["custom-avatars"], reset: false })) {
          pending.delete(reject);
          resolve();
        }
      });
      sender.send({ type: "broadcast", method: "query-cache-invalidate", version: 0, sourceClientId: sender.id, params: { queryKey: ["custom-avatars"], reset: false } });
    });
    return { socketPath, handshakeConfirmed: true, relayConfirmed: true, hostRefreshRequested: true };
  } finally {
    clearTimeout(deadline);
    for (const socket of sockets) {
      socket.removeAllListeners("close");
      socket.destroy();
    }
  }
}

// src/native-refresh.ts
import { createHash as createHash2 } from "node:crypto";
import { readFile as readFile3, readdir } from "node:fs/promises";
import { homedir as homedir3, tmpdir } from "node:os";
import path4 from "node:path";
async function refreshNativePet(options) {
  const expectedSpriteSha256 = createHash2("sha256").update(await readFile3(options.expectedSpritePath)).digest("hex");
  const errors = [];
  const useIpc = options.ipcSocketPath !== null && (typeof options.ipcSocketPath === "string" || isLiveNativeDestination(path4.dirname(options.expectedSpritePath)));
  if (useIpc) {
    try {
      const ipc = await refreshViaIpc(options.ipcSocketPath ?? void 0, options.timeoutMs ?? 2e3);
      return {
        automaticRefresh: true,
        refreshRequested: true,
        displayStatus: "unconfirmed",
        strategy: "ipc-query-invalidate",
        ipc,
        expectedSpriteSha256,
        notice: "Automatic refresh requested through the existing desktop IPC channel. Router relay confirmed; the displayed sprite hash was not measured."
      };
    } catch (error) {
      errors.push(`ipc: ${error.message}`);
    }
  }
  return {
    automaticRefresh: false,
    refreshRequested: false,
    displayStatus: "unconfirmed",
    strategy: "none",
    expectedSpriteSha256,
    notice: useIpc ? "Files committed to the same GenPet entry. IPC refresh failed; retry when the desktop is running and ready. Visible update remains unconfirmed." : "Files committed to the same GenPet entry. IPC refresh was skipped for this destination. Visible update remains unconfirmed.",
    errors: errors.length ? errors : void 0
  };
}
function isLiveNativeDestination(destination) {
  if (process.env.GENPET_SKIP_NATIVE_REFRESH === "1") return false;
  const belongs = (home) => {
    const relative = path4.relative(path4.resolve(home, "pets"), path4.resolve(destination));
    return !!relative && !relative.includes(path4.sep) && /^genpet-[a-zA-Z0-9_-]+$/.test(relative);
  };
  if (!process.env.CODEX_HOME && belongs(path4.join(homedir3(), ".codex"))) return true;
  const configured = process.env.CODEX_HOME;
  if (!configured) return false;
  const resolved = path4.resolve(configured);
  const temp = path4.resolve(tmpdir());
  const relativeToTemp = path4.relative(temp, resolved);
  if (configured.startsWith("/var/folders/") || configured.includes("/tmp/") || relativeToTemp === "" || relativeToTemp !== ".." && !relativeToTemp.startsWith(`..${path4.sep}`) && !path4.isAbsolute(relativeToTemp)) return false;
  return belongs(resolved);
}

// src/native-pet-live.ts
import { randomUUID as randomUUID5 } from "node:crypto";
import net2 from "node:net";
var maxFrameBytes = 8 * 1024 * 1024;
var selectedKey = "selected-avatar-id";
function record(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function connection(options) {
  const pipePath = (Object.hasOwn(options, "pipePath") ? options.pipePath : process.env.CODEX_APP_TOOLS_PIPE_PATH)?.trim();
  const threadId = (Object.hasOwn(options, "threadId") ? options.threadId : process.env.CODEX_THREAD_ID)?.trim();
  if (!pipePath || !threadId) throw new Error("The current Codex app tools pipe and thread ID are unavailable.");
  if (process.platform === "win32" && !pipePath.startsWith("\\\\.\\pipe\\")) {
    throw new Error("Expected a local Windows named pipe for Codex app tools.");
  }
  const timeoutMs = options.timeoutMs ?? 5e3;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("The Codex app tools timeout must be positive.");
  return { pipePath, threadId, timeoutMs };
}
function frame(message) {
  const payload = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length);
  return Buffer.concat([header, payload]);
}
function projectSelection(value) {
  if (!record(value) || !record(value.settings) || !record(value.effectiveSettings)) {
    throw new Error("Codex returned an invalid settings response.");
  }
  const selectedPetId = value.settings[selectedKey] ?? null;
  const effectiveSelectedPetId = value.effectiveSettings[selectedKey] ?? null;
  if (selectedPetId !== null && typeof selectedPetId !== "string" || effectiveSelectedPetId !== null && typeof effectiveSelectedPetId !== "string") {
    throw new Error("Codex returned an invalid pet selection.");
  }
  return { selectedPetId, effectiveSelectedPetId };
}
async function requestSelection(options, petId) {
  const { pipePath, threadId, timeoutMs } = connection(options);
  const id = 1;
  const request = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      namespace: "codex_app",
      tool: petId === void 0 ? "read_settings" : "write_settings",
      arguments: petId === void 0 ? { include_config: false } : { settings: { [selectedKey]: petId } },
      callerSource: "codex",
      threadId,
      callId: `mcp-call-${randomUUID5()}`,
      // These fallbacks follow the bundled app-tools MCP's request metadata.
      turnId: `mcp-turn-${randomUUID5()}`
    }
  };
  return new Promise((resolve, reject) => {
    const socket = net2.createConnection(pipePath);
    let pending = Buffer.alloc(0);
    let settled = false;
    let sent = false;
    const finish = (error, result, cancel = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (cancel && sent && !socket.destroyed) {
        socket.end(frame({ jsonrpc: "2.0", id, method: "tools/cancel" }));
        socket.destroySoon();
      } else socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };
    const timer = setTimeout(() => finish(new Error("Codex app tools timed out; the current selection is unconfirmed."), void 0, true), timeoutMs);
    socket.once("connect", () => {
      sent = true;
      socket.write(frame(request));
    });
    socket.on("error", (error) => finish(new Error(`Codex app tools connection failed (${error.code ?? "socket error"}).`)));
    socket.on("close", () => finish(new Error("Codex app tools closed before confirming the pet selection.")));
    socket.on("data", (bytes) => {
      if (settled) return;
      pending = Buffer.concat([pending, bytes]);
      while (pending.length >= 4) {
        const length = pending.readUInt32LE(0);
        if (length > maxFrameBytes) return finish(new Error("Codex app tools response exceeded the size limit."));
        if (pending.length < length + 4) return;
        let response;
        try {
          response = JSON.parse(pending.subarray(4, length + 4).toString("utf8"));
        } catch {
          return finish(new Error("Codex app tools returned invalid JSON."));
        }
        pending = pending.subarray(length + 4);
        if (!record(response) || response.id !== id) continue;
        if (response.error !== void 0) return finish(new Error("Codex rejected the app tool request."));
        const result = response.result;
        if (!record(result) || result.success !== true || !Array.isArray(result.contentItems)) {
          return finish(new Error("Codex could not complete the pet settings request."));
        }
        const item = result.contentItems.find((item2) => record(item2) && item2.type === "inputText");
        if (!record(item) || typeof item.text !== "string") return finish(new Error("Codex returned no pet settings result."));
        try {
          finish(void 0, projectSelection(JSON.parse(item.text)));
        } catch {
          finish(new Error("Codex returned an invalid pet settings result."));
        }
      }
    });
  });
}
async function readNativePetLive(options = {}) {
  try {
    return { available: true, ...await requestSelection(options) };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : "Live Codex pet selection is unavailable." };
  }
}
async function selectNativePetLive(petId, options = {}) {
  if (typeof petId !== "string" || petId.trim() !== petId || petId.length === 0 || petId.length > 512 || /[\x00-\x1f\x7f]/.test(petId)) {
    throw new Error("A valid pet ID is required.");
  }
  await requestSelection(options, petId);
  const result = await requestSelection(options);
  if (result.selectedPetId !== petId || result.effectiveSelectedPetId !== petId) {
    throw new Error("The live Codex selection did not match the requested pet; its current selection is unconfirmed.");
  }
  return { ...result, immediate: true, restartRequired: false, hostStateConfirmed: true, visualVerified: false };
}

// src/art.ts
import { homedir as homedir4 } from "node:os";

// src/prompts.ts
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "node:fs";
import path6 from "node:path";

// src/plugin-root.ts
import { existsSync as existsSync2 } from "node:fs";
import path5 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
function pluginRoot() {
  const moduleDirectory = path5.dirname(fileURLToPath2(import.meta.url));
  const candidates = [
    path5.resolve(moduleDirectory, ".."),
    path5.resolve(moduleDirectory, "..", "plugins", "genpet")
  ];
  return candidates.find((candidate) => existsSync2(path5.join(candidate, ".codex-plugin", "plugin.json"))) ?? candidates[0];
}

// src/prompts.ts
function packageHost() {
  const file = path6.join(pluginRoot(), "config", "host.json");
  const host = existsSync3(file) ? JSON.parse(readFileSync2(file, "utf8")).host : "desktop";
  if (!["desktop", "dots"].includes(host)) throw new Error("Invalid package host");
  return host;
}
function readPromptFile(fileName) {
  const candidates = [path6.resolve(import.meta.dirname, "..", "framework", "prompts", fileName), path6.join(pluginRoot(), "prompts", fileName)];
  const file = candidates.find(existsSync3);
  if (!file) throw new Error(`Missing prompt file: ${fileName}`);
  return readFileSync2(file, "utf8");
}
function readPrompt(name) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("Invalid prompt module");
  return readPromptFile(`${name}.md`);
}
function readUnits() {
  return JSON.parse(readPromptFile("units.json")).units;
}

// src/art.ts
var actions = [
  { name: "idle", row: 0, count: 6, durations: [280, 110, 110, 140, 140, 320] },
  { name: "running-right", row: 1, count: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: "running-left", row: 2, count: 8, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  { name: "waving", row: 3, count: 4, durations: [140, 140, 140, 280] },
  { name: "jumping", row: 4, count: 5, durations: [140, 140, 140, 140, 280] },
  { name: "failed", row: 5, count: 8, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  { name: "waiting", row: 6, count: 6, durations: [150, 150, 150, 150, 150, 260] },
  { name: "running", row: 7, count: 6, durations: [120, 120, 120, 120, 120, 220] },
  { name: "review", row: 8, count: 6, durations: [150, 150, 150, 150, 150, 280] }
];
function artRequest(state) {
  if (!state.pet || !state.pending?.plan) return null;
  const plan = state.pending.plan, existing = desiredAppearance(state), id = requestId(state);
  const references2 = state.art.filter((art) => art.petId === state.pet.id && (art.kind === "portrait" || state.host === "dots" && art.kind === "avatar"));
  return {
    id,
    operationId: state.pending.id,
    petId: state.pet.id,
    host: state.host,
    status: !plan.appearance ? "unchanged" : existing ? "ready" : "pending",
    stage: plan.stage,
    name: state.pet.name,
    naming: state.pet.naming,
    personality: state.pet.personality ?? plan.personality,
    genes: state.pet.genes ?? plan.genes,
    story: plan.text,
    appearance: plan.appearance,
    reusableAppearances: state.art.filter((art) => art.petId === state.pet.id && ["atlas", "avatar"].includes(art.kind)),
    referenceFiles: [...new Set([
      references2.find((art) => art.stage === "egg")?.file,
      references2.find((art) => art.stage !== "egg")?.file,
      references2.at(-1)?.file
    ].filter((file) => !!file))],
    prompt: readPrompt("meta") + "\n" + readPrompt("appearance"),
    contract: state.host === "desktop" ? { columns: 8, cellWidth: 192, cellHeight: 208, rows: 11, spriteVersionNumber: 2 } : null,
    target: state.pet.binding ?? null
  };
}
async function validateImage(file, kind) {
  const info = await stat2(file);
  if (!info.isFile() || info.size > 64 * 1024 * 1024) throw new Error("Artifact must be a regular file below 64 MiB");
  if (kind === "artifact") return { format: "artifact", width: 0, height: 0, hasAlpha: false };
  const meta = await readImageInfo(file);
  if (["portrait", "atlas"].includes(kind) && !meta.hasAlpha) throw new Error("Pet images must have an alpha channel");
  if (meta.width * meta.height > 16e6) throw new Error("Image exceeds size limit");
  if (kind === "atlas" && (meta.width !== 1536 || meta.height !== 2288)) throw new Error("Atlas must be 1536 \xD7 2288 (v2)");
  const decoded = await decodeRgba(file);
  if (kind === "atlas") {
    const { data, width } = decoded;
    for (let row = 0; row < 11; row++) for (let col = 0; col < 8; col++) {
      let visible = 0;
      const used = col < (row < 9 ? actions[row].count : 8) || row === 0 && col === 6;
      for (let y = row * 208; y < (row + 1) * 208; y++) for (let x = col * 192; x < (col + 1) * 192; x++) if (data[(y * width + x) * 4 + 3] > 0) visible++;
      if (used && visible < 30) throw new Error(`Empty animation cell ${row},${col}`);
      if (!used && visible > 0) throw new Error(`Unused cell ${row},${col} must be transparent`);
    }
  }
  return meta;
}
async function acceptArt(store2, input) {
  if (!path7.isAbsolute(input.file)) throw new Error("Artifact file must be an absolute local path");
  if (!["portrait", "atlas", "avatar", "story", "artifact"].includes(input.kind)) throw new Error("Unknown artifact kind");
  if (!input.provenance?.trim()) throw new Error("Record generation and validation provenance");
  await validateImage(input.file, input.kind);
  const bytes = await readFile4(input.file);
  return store2.transaction(async (state) => {
    if (requestId(state) !== input.requestId) throw new Error("Stale design request");
    if (state.host === "dots" && input.kind === "atlas" || state.host === "desktop" && input.kind === "avatar") throw new Error("Artwork uses the other host format");
    const id = `art-${createHash3("sha256").update(state.pet.id + input.requestId + input.kind).update(bytes).digest("hex").slice(0, 24)}`;
    const previous = state.art.find((art) => art.id === id);
    if (previous) {
      await stat2(previous.file);
      return previous;
    }
    const dir = path7.join(store2.root, "pets", state.pet.id, "assets");
    await mkdir2(dir, { recursive: true, mode: 448 });
    const ext = path7.extname(input.file).toLowerCase(), file = path7.join(dir, id + ext);
    const tmp = file + "." + randomUUID6() + ".tmp";
    try {
      await writeFile2(tmp, bytes, { mode: 384, flag: "wx" });
      await rename2(tmp, file);
    } finally {
      await (await import("node:fs/promises")).rm(tmp, { force: true });
    }
    const record2 = {
      id,
      petId: state.pet.id,
      requestId: input.requestId,
      stage: state.pending.plan.stage,
      description: input.description?.trim() || state.pending.plan.appearance?.description || state.pending.plan.state,
      file,
      kind: input.kind,
      createdAt: Date.now(),
      provenance: input.provenance
    };
    state.art.push(record2);
    return record2;
  });
}
function desktopDestination(state) {
  if (!state.pet) throw new Error("No pet");
  const home = process.env.CODEX_HOME || path7.join(homedir4(), ".codex");
  const destination = state.pet.binding?.destination ?? path7.join(home, "pets", state.pet.id);
  const relative = path7.relative(path7.resolve(home, "pets"), path7.resolve(destination));
  if (!relative || relative.startsWith("..") || path7.isAbsolute(relative) || relative.includes(path7.sep)) throw new Error("Target must be one entry in this Codex home");
  if (state.pet.binding && state.pet.binding.avatarId !== `custom:${path7.basename(destination)}`) throw new Error("Avatar binding does not match its destination");
  return destination;
}
async function exportNative(state, destination) {
  if (!state.pet || state.host !== "desktop") throw new Error("Native export requires a desktop pet");
  const art = desiredAppearance(state);
  if (!art || art.kind !== "atlas") throw new Error("Complete or select a validated atlas first");
  await validateImage(art.file, "atlas");
  let previous;
  try {
    previous = await readFile4(path7.join(destination, "pet.json"), "utf8");
    const old = JSON.parse(previous);
    const transferred = state.replacesPetId && old.genpetId === state.replacesPetId && state.pet.binding?.destination === destination;
    if (old.genpetId !== state.pet.id && !transferred && !(state.legacy && state.pet.binding?.destination === destination && !old.genpetId)) throw new Error("Target entry belongs to another pet; it was preserved");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir2(destination, { recursive: true });
  const hash = createHash3("sha256").update(await readFile4(art.file)).digest("hex").slice(0, 16);
  const spritesheetPath = `spritesheet-${hash}${path7.extname(art.file)}`;
  const tmp = path7.join(destination, `.pending-${randomUUID6()}`);
  await copyFile(art.file, tmp);
  await rename2(tmp, path7.join(destination, spritesheetPath));
  const manifest = {
    id: path7.basename(destination),
    genpetId: state.pet.id,
    displayName: state.pet.name,
    description: "GenPet \xB7 a companion with its own stories",
    spriteVersionNumber: 2,
    spritesheetPath
  };
  if (previous) await writeFile2(path7.join(destination, "previous-pet.json"), previous);
  const manifestTmp = path7.join(destination, `.pet-${randomUUID6()}.json`);
  await writeFile2(manifestTmp, JSON.stringify(manifest, null, 2));
  await rename2(manifestTmp, path7.join(destination, "pet.json"));
  return { destination, manifest, artId: art.id, filesCommitted: true };
}
async function installNative(store2, options = {}) {
  if (store2.demo) throw new Error("Demo state cannot install a native Pet");
  if (store2.host !== "desktop") throw new Error("Dots uses its own Avatar adapter");
  return store2.transaction(async (state) => {
    if (!state.pending?.plan?.appearance) throw new Error("No planned appearance update");
    const operationId = state.pending.id, destination = desktopDestination(state), avatarId = `custom:${path7.basename(destination)}`;
    const result = await exportNative(state, destination);
    state.pet.binding = { host: "desktop", avatarId, destination };
    const selection2 = await (options.selection ?? readNativePetLive)();
    const active = selection2.available ? selection2.effectiveSelectedPetId === avatarId : null;
    const refresh = await (options.refresh ?? refreshNativePet)({ expectedSpritePath: path7.join(destination, result.manifest.spritesheetPath) });
    const hostResult = validateHostResult(state, operationId, {
      petId: state.pet.id,
      operationId,
      appearanceId: result.artId,
      avatarId,
      updated: true,
      active,
      refreshRequested: refresh.refreshRequested === true,
      displayStatus: refresh.displayStatus,
      ...!refresh.automaticRefresh && (active === true || active === null && isLiveNativeDestination(destination)) ? { error: "Active Avatar refresh did not complete" } : {}
    });
    state.pending.hostResult = hostResult;
    return { ...result, ...hostResult, refresh };
  });
}

// src/hosts.ts
import { spawn } from "node:child_process";
import { readFile as readFile5, stat as stat3 } from "node:fs/promises";
import path8 from "node:path";
function hostRequest(state) {
  if (state.host !== "dots") throw new Error("This handoff is for Dots Avatar updates");
  if (!state.pending?.plan?.appearance) throw new Error("No planned Avatar update");
  if (!state.pet?.binding) throw new Error("Bind the actual Dots Avatar before requesting an update");
  const pending = pendingFor(state, state.pending.id), art = desiredAppearance(state);
  if (!art || art.kind !== "avatar") throw new Error("Complete or select Dots Avatar artwork first");
  return {
    operation: "update-avatar",
    petId: pending.petId,
    operationId: pending.id,
    name: state.pet.name,
    target: state.pet.binding,
    file: art.file,
    appearanceId: art.id,
    description: state.pending.plan.appearance.description,
    stage: state.pending.plan.stage,
    refreshWhenActive: true,
    preserveCurrentSelection: true
  };
}
async function bindAvatar(store2, avatarId) {
  if (store2.demo || store2.host !== "dots") throw new Error("bind-avatar is for a real Dots pet");
  return store2.transaction((state) => {
    if (!state.pet) throw new Error("Allocate the pet identity first");
    const id = text(avatarId, "avatarId");
    if (state.pet.binding && state.pet.binding.avatarId !== id) throw new Error("Target is already bound; preserve the existing Avatar");
    return state.pet.binding ??= { host: "dots", avatarId: id };
  });
}
async function configureAdapter(store2, adapter) {
  if (store2.host !== "dots") throw new Error("Desktop has its own native adapter");
  if (!path8.isAbsolute(adapter.command) || !(await stat3(adapter.command)).isFile() || !Array.isArray(adapter.args) || !adapter.args.every((arg) => typeof arg === "string")) throw new Error("Adapter needs an absolute executable and string arguments");
  await atomicJson(path8.join(store2.root, "avatar-adapter.json"), adapter);
  return adapter;
}
async function invoke(adapter, request) {
  return new Promise((resolve, reject) => {
    const child = spawn(adapter.command, adapter.args, { shell: false, stdio: ["pipe", "pipe", "pipe"] });
    let output = "", error = "", settled = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error("Dots Avatar adapter timed out; resume this operation"));
    }, 2e4);
    function finish(failure, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (failure) reject(failure);
      else resolve(value);
    }
    child.once("error", (error2) => finish(error2));
    child.stdin.on("error", (error2) => finish(error2));
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.length > 1024 * 1024) {
        child.kill();
        finish(new Error("Avatar adapter response is too large"));
      }
    });
    child.stderr.on("data", (chunk) => {
      if (error.length < 4096) error += chunk;
    });
    child.once("close", (code) => {
      if (code !== 0) return finish(new Error(`Avatar adapter failed (${code}): ${error}`));
      try {
        finish(void 0, JSON.parse(output));
      } catch {
        finish(new Error("Avatar adapter must return one JSON result"));
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
async function publishDots(store2) {
  if (store2.demo) throw new Error("Demo records cannot update a host Avatar");
  const request = hostRequest(await store2.peek());
  const adapter = JSON.parse(await readFile5(path8.join(store2.root, "avatar-adapter.json"), "utf8"));
  const result = await invoke(adapter, request);
  return recordHostResult(store2, request.operationId, result);
}

// src/generation.ts
import { createHash as createHash4 } from "node:crypto";
var object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function definition(unit) {
  const units = readUnits();
  if (!Object.hasOwn(units, unit)) throw new Error(`Unknown generation unit: ${unit}`);
  return units[unit];
}
function references(value) {
  if (!Array.isArray(value)) throw new Error("inputRefs must be an array");
  return value.map((ref) => text(ref, "input reference"));
}
function validateUnitResult(unit, input) {
  const contract = definition(unit);
  if (!object(input) || !object(input.result)) throw new Error("A unit result requires an object envelope and result");
  const inputRefs = references(input.inputRefs), result = input.result;
  for (const [field, type] of Object.entries(contract.result)) {
    const value = result[field];
    const valid = type === "string" ? typeof value === "string" && !!value.trim() : type === "array" ? Array.isArray(value) : type === "object" ? object(value) : type === "nullable-string" ? value === null || typeof value === "string" && !!value.trim() : type === "nullable-object" ? value === null || object(value) : false;
    if (!Object.hasOwn(result, field) || !valid) throw new Error(`${unit}.${field} requires ${type}`);
  }
  for (const [field, choices] of Object.entries(contract.choices ?? {}))
    if (!choices.includes(result[field])) throw new Error(`Invalid ${unit}.${field}`);
  return { inputRefs, result };
}
function unitRequest(unit, fixture) {
  const contract = definition(unit);
  if (!object(fixture) || !object(fixture.inputs)) throw new Error("A unit fixture requires inputs");
  for (const field of contract.inputs) if (!Object.hasOwn(fixture.inputs, field)) throw new Error(`Missing ${unit} input: ${field}`);
  const inputRefs = references(fixture.inputRefs ?? []);
  const prompt = [
    `\u8FD9\u662F\u72EC\u7ACB\u5355\u5143\u6D4B\u8BD5\uFF0C\u53EA\u6267\u884C ${unit}\u3002\u4E0B\u6E38\u6D41\u7A0B\u53EA\u4F5C\u80CC\u666F\uFF0C\u4E0D\u6267\u884C\u5176\u4ED6\u5355\u5143\u3002\u53EA\u4F7F\u7528\u4E0B\u9762\u63D0\u4F9B\u7684\u8F93\u5165\u4E0E\u771F\u5B9E\u6587\u4EF6\uFF1B\u4E0D\u5F97\u8865\u67E5\u771F\u5B9E\u7528\u6237\u8D44\u6599\u3001\u64CD\u4F5C Pet/Avatar\u3001\u521B\u5EFA\u8C03\u5EA6\u6216\u6267\u884C\u5B8C\u6574\u751F\u547D\u5468\u671F\u3002\u9700\u8981\u56FE\u50CF\u68C0\u67E5\u65F6\u5B9E\u9645\u67E5\u770B\u8F93\u5165\u6587\u4EF6\u3002`,
    readPrompt("meta"),
    readPrompt(unit),
    `\u8FD4\u56DE\u4E00\u4E2A JSON \u5BF9\u8C61\uFF1AinputRefs \u4E3A\u8F93\u5165\u5F15\u7528\u5217\u8868\uFF0Cresult \u4E3A\u672C\u5355\u5143\u7ED3\u679C\u3002\u6240\u9700\u5B57\u6BB5\u4E0E\u7C7B\u578B\uFF1A${JSON.stringify(contract.result)}\u3002${contract.choices ? `\u5DE5\u7A0B\u53D6\u503C\uFF1A${JSON.stringify(contract.choices)}\u3002` : ""}\u53EF\u589E\u52A0\u5B57\u6BB5\uFF0C\u5185\u5BB9\u4FDD\u6301\u5F00\u653E\u3002\u4E0D\u8981\u8F93\u51FA\u989D\u5916\u7684\u6D41\u7A0B\u8BF4\u660E\u3002`,
    `\u56FA\u5B9A\u8F93\u5165\uFF1A${JSON.stringify({ inputRefs, inputs: fixture.inputs }, null, 2)}`
  ].join("\n\n");
  return { unit, inputRefs, prompt, promptHash: createHash4("sha256").update(prompt).digest("hex") };
}
function canonical(value) {
  return JSON.stringify(value, (_, item) => object(item) ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
}
async function recordStep(store2, operationId, unit, input) {
  const output = validateUnitResult(unit, input);
  return store2.transaction((state) => {
    const owner = state.pending?.id === operationId ? pendingFor(state, operationId) : state.stories.find((story) => story.id === operationId && story.petId === state.pet?.id);
    if (!owner) throw new Error("Generation step belongs to another or missing story");
    const id = `step-${createHash4("sha256").update(canonical([operationId, unit, output])).digest("hex").slice(0, 24)}`;
    const steps = owner.steps ??= [], previous = steps.find((step2) => step2.id === id);
    if (previous) return previous;
    const step = { id, unit, at: Date.now(), ...output };
    steps.push(step);
    return step;
  });
}

// src/migration.ts
import { readFile as readFile6, copyFile as copyFile2, mkdir as mkdir3 } from "node:fs/promises";
import path9 from "node:path";
import { randomUUID as randomUUID7 } from "node:crypto";
async function migrateLegacy(store2, file, design) {
  if (store2.host !== "desktop" || store2.demo) throw new Error("Legacy migration is for desktop records");
  if (!path9.isAbsolute(file)) throw new Error("Legacy file must be absolute");
  const legacy = JSON.parse(await readFile6(file, "utf8"));
  if (legacy.version !== 1 || !legacy.pet) throw new Error("No v1 pet to migrate");
  const genes = text(design.genes, "observed legacy identity"), place = text(design.place, "origin"), connection2 = text(design.connection, "connection");
  return store2.transaction(async (state) => {
    if (state.legacy && state.pet?.id === legacy.pet.id) return state;
    if (state.pet) throw new Error("Migration never replaces an existing v2 pet");
    const petId = identifier(legacy.pet.id, "legacy petId");
    const stage = validateStage("egg", legacy.pet.stage);
    const backup = path9.join(store2.root, "backups", `legacy-${randomUUID7()}.json`);
    await atomicJson(backup, legacy);
    state.pet = {
      id: petId,
      name: text(legacy.pet.profile?.name ?? "GenPet", "name"),
      adoptedAt: legacy.pet.adoptedAt,
      revision: 1,
      genes,
      stage,
      acquisition: { place, connection: connection2, storyId: "legacy" },
      state: { description: legacy.pet.state?.reason || "Continuing the existing companion", updatedAt: Date.now() }
    };
    state.legacy = { backup, importedAt: Date.now() };
    const destination = legacy.nativeExport?.destination;
    if (destination) state.pet.binding = { host: "desktop", avatarId: `custom:${path9.basename(destination)}`, destination };
    const dir = path9.join(store2.root, "pets", petId, "assets");
    await mkdir3(dir, { recursive: true });
    for (const art of legacy.art ?? []) {
      if (!["portrait", "atlas"].includes(art.kind) || !path9.isAbsolute(art.file)) continue;
      const id = `art-${randomUUID7()}`, target2 = path9.join(dir, id + path9.extname(art.file));
      try {
        await copyFile2(art.file, target2);
      } catch (error) {
        if (error.code === "ENOENT") continue;
        throw error;
      }
      state.art.push({ id, petId, requestId: "legacy", stage: validateStage("egg", art.stage), description: "Imported existing artwork", file: target2, kind: art.kind, createdAt: art.createdAt, provenance: art.provenance || "Preserved v1 artwork" });
      if (art.kind === "atlas" && art.stage === stage) state.pet.state.appearanceId = id;
    }
    return state;
  });
}

// src/native-pets.ts
import { readFile as readFile7, readdir as readdir2 } from "node:fs/promises";
import { homedir as homedir5 } from "node:os";
import path10 from "node:path";

// node_modules/smol-toml/dist/error.js
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r?\n/);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r?\n/);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
var TomlError = class _TomlError extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
  /** @internal */
  static x(message, ctx, ptr) {
    throw new _TomlError(message, { toml: ctx.s, ptr: ptr ?? ctx.p });
  }
};

// node_modules/smol-toml/dist/primitive.js
function parseString(ctx) {
  let startPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p++);
  let first = c;
  let isLiteral = c === 39;
  let isMultiline = c === ctx.s.charCodeAt(ctx.p) && c === ctx.s.charCodeAt(ctx.p + 1);
  if (isMultiline) {
    if ((c = ctx.s.charCodeAt(ctx.p += 2)) === 10)
      ctx.p++;
    else if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)
      ctx.p += 2;
  }
  let parsed = "";
  let sliceStart = ctx.p;
  let state = 0;
  for (; ctx.p < ctx.s.length; ctx.p++) {
    c = ctx.s.charCodeAt(ctx.p);
    if (isMultiline && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)) {
      state = state && 3;
    } else if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in strings", ctx);
    } else if ((!state || state === 3) && c === first && (!isMultiline || ctx.s.charCodeAt(ctx.p + 1) === first && ctx.s.charCodeAt(ctx.p + 2) === first)) {
      if (isMultiline) {
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
        if (ctx.s.charCodeAt(ctx.p + 3) === first)
          ctx.p++;
      }
      if (!state) {
        let s = ctx.s.slice(sliceStart, ctx.p);
        parsed = parsed ? parsed + s : s;
      }
      ctx.p += isMultiline ? 3 : 1;
      return parsed;
    } else if (!state) {
      if (!isLiteral && c === 92) {
        parsed += ctx.s.slice(sliceStart, sliceStart = ctx.p);
        state = 1;
      }
    } else if (state === 1) {
      if (c === 120 || c === 117 || c === 85) {
        let errPtr = ctx.p++ - 1;
        let value = 0;
        let len = c === 120 ? 2 : c === 117 ? 4 : 8;
        for (let j = 0; j < len; j++, ctx.p++) {
          let hex = ctx.s.charCodeAt(ctx.p);
          let digit = (
            /* 0-9 */
            hex >= 48 && hex <= 57 ? hex - 48 : (
              /* A-F */
              hex >= 65 && hex <= 70 ? hex - 65 + 10 : (
                /* a-f */
                hex >= 97 && hex <= 102 ? hex - 97 + 10 : -1
              )
            )
          );
          if (digit < 0)
            TomlError.x("invalid non-hex character in unicode escape", ctx);
          value = value << 4 | digit;
        }
        if (value < 0 || value > 1114111 || value >= 55296 && value <= 57343) {
          TomlError.x("invalid unicode escape", ctx, errPtr);
        }
        parsed += String.fromCodePoint(value);
        sliceStart = ctx.p--;
        state = 0;
      } else if (isMultiline && (c === 32 || c === 9)) {
        state = 2;
      } else {
        if (c === 98)
          parsed += "\b";
        else if (c === 116)
          parsed += "	";
        else if (c === 110)
          parsed += "\n";
        else if (c === 102)
          parsed += "\f";
        else if (c === 114)
          parsed += "\r";
        else if (c === 101)
          parsed += "\x1B";
        else if (c === 34)
          parsed += '"';
        else if (c === 92)
          parsed += "\\";
        else
          TomlError.x("unrecognised escape sequence", ctx);
        sliceStart = ctx.p + 1;
        state = 0;
      }
    } else if (c !== 32 && c !== 9) {
      if (state === 2)
        TomlError.x("invalid escape: only line-ending whitespace may be escaped", ctx, sliceStart);
      state = !isLiteral && c === 92 ? 1 : 0;
      sliceStart = ctx.p;
    }
  }
  TomlError.x("unfinished string", ctx, startPtr);
}

// node_modules/smol-toml/dist/date.js
var DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[Tt ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|z|[-+]\d{2}:\d{2})?$/i;
var TomlDate = class _TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date, fasttype, unsafeDelim) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    let c;
    if (typeof date === "string") {
      if (fasttype)
        prep: {
          if (fasttype < 3) {
            if (+date.slice(11, 13) > 23) {
              date = "";
              break prep;
            }
            if (fasttype === 2) {
              offset = null;
              date += "Z";
            } else if ((c = date.charCodeAt(date.length - 1)) !== 90 && c !== 122) {
              offset = date.slice(date.length - 6);
            }
            if (unsafeDelim)
              date = date.slice(0, 10) + "T" + date.slice(11);
          } else if (fasttype === 4) {
            date = +date.slice(0, 2) > 23 ? "" : `0000-01-01T${date}Z`;
          }
          hasDate = fasttype !== 4;
          hasTime = fasttype !== 3;
        }
      else {
        let match = date.match(DATE_TIME_RE);
        if (match) {
          if (!match[1]) {
            hasDate = false;
            date = `0000-01-01T${date}`;
          }
          hasTime = !!match[2];
          hasTime && date[10] === " " && (date = date.replace(" ", "T"));
          if (match[2] && +match[2] > 23) {
            date = "";
          } else {
            offset = match[3] || null;
            if (!offset && hasTime)
              date += "Z";
          }
        } else {
          date = "";
        }
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z" || this.#offset === "z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new _TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new _TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
};

// node_modules/smol-toml/dist/extract.js
function isDigit(char, base = 10) {
  return base === 16 ? char > 47 && char < 58 || char > 64 && char < 71 || char > 96 && char < 103 : char > 47 && char < 48 + base;
}
function isEndOfValue(char, delim) {
  return char === 32 || char === 9 || char === 10 || char === 13 || // Structure end or next value delimiter
  delim && (char === delim || char === 44) || // Comment
  char === 35;
}
function extractValue(ctx, end) {
  let errPtr = ctx.p;
  let c = ctx.s.charCodeAt(ctx.p);
  if (c === 91 || c === 123) {
    ctx.d-- || TomlError.x("document contains excessively nested structures. aborting.", ctx);
    let value = c === 91 ? parseArray(ctx) : parseInlineTable(ctx);
    ctx.d++;
    return value;
  }
  if (c === 34 || c === 39) {
    return parseString(ctx);
  }
  if (c === 116) {
    if (ctx.s.charCodeAt(++ctx.p) !== 114 || ctx.s.charCodeAt(++ctx.p) !== 117 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, true;
  }
  if (c === 102) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 108 || ctx.s.charCodeAt(++ctx.p) !== 115 || ctx.s.charCodeAt(++ctx.p) !== 101)
      TomlError.x("invalid value", ctx, errPtr);
    return ctx.p++, false;
  }
  if (c === 43 || c === 45) {
    return parseNumber(ctx, ctx.p, ctx.s.charCodeAt(++ctx.p), 44 - c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 4) === 45 && ctx.s.charCodeAt(ctx.p + 7) === 45) {
    return parseDate(ctx, c, end);
  }
  if (ctx.s.charCodeAt(ctx.p + 2) === 58) {
    return parseTime(ctx, c, end);
  }
  return parseNumber(ctx, ctx.p, c, 0, end);
}
function parseNumber(ctx, startPtr, startChr, sign, endChr) {
  let c = startChr;
  let state = 0;
  let hasUnderscores = false;
  if (c === 105) {
    if (ctx.s.charCodeAt(++ctx.p) !== 110 || ctx.s.charCodeAt(++ctx.p) !== 102)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, (sign || 1) / 0;
  }
  if (c === 110) {
    if (ctx.s.charCodeAt(++ctx.p) !== 97 || ctx.s.charCodeAt(++ctx.p) !== 110)
      TomlError.x("invalid value", ctx, startPtr);
    return ctx.p++, NaN;
  }
  if (c === 48) {
    if (++ctx.p >= ctx.s.length || isEndOfValue(c = ctx.s.charCodeAt(ctx.p), endChr))
      return ctx.bi === true ? 0n : 0;
    if (!sign) {
      if (c === 120)
        return parseIntegerBaseN(ctx, startPtr, 16, endChr);
      else if (c === 98)
        return parseIntegerBaseN(ctx, startPtr, 2, endChr);
      else if (c === 111)
        return parseIntegerBaseN(ctx, startPtr, 8, endChr);
    }
    if (c === 46)
      state = 2;
    else if (c === 101 || c === 69)
      state = 4;
    else
      TomlError.x("illegal leading zero", ctx, startPtr);
  } else if (!isDigit(c))
    TomlError.x("invalid value", ctx, startPtr);
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (!state)
      state = 1;
    if (c === 95) {
      if (!(state & 1))
        TomlError.x("illegal underscore", ctx);
      state += 11;
      hasUnderscores = true;
    } else if (state === 1 && c === 46)
      state = 2;
    else if ((state === 1 || state === 3) && (c === 101 || c === 69))
      state = 4;
    else if (state === 4 && (c === 43 || c === 45)) {
    } else if (!isDigit(c))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (state > 9)
      state -= 11;
    else if (!(state & 1))
      state++;
  }
  if (!state) {
    let val = (startChr - 48) * (sign || 1);
    return ctx.bi === true ? BigInt(val) : val;
  }
  if (!(state & 1))
    TomlError.x("unfinished numeric value", ctx, startPtr);
  let str = ctx.s.slice(startPtr, ctx.p);
  if (hasUnderscores)
    str = str.replaceAll("_", "");
  return state > 1 ? parseFloat(str) : parseInteger(ctx, str, 10, startPtr);
}
function parseIntegerBaseN(ctx, startPtr, base, endChr) {
  let c, underscore = 1;
  while (++ctx.p < ctx.s.length && (c = ctx.s.charCodeAt(ctx.p), !isEndOfValue(c, endChr))) {
    if (c === 95) {
      if (underscore & 1)
        TomlError.x("illegal underscore", ctx);
      underscore = 3;
    } else if (!isDigit(c, base))
      TomlError.x(`illegal character in numeric literal`, ctx);
    else if (underscore & 1)
      underscore--;
  }
  if (underscore & 1)
    TomlError.x("unfinished numeric value", ctx);
  let str = ctx.s.slice(startPtr + 2, ctx.p);
  if (underscore)
    str = str.replaceAll("_", "");
  return parseInteger(ctx, str, base, startPtr);
}
function parseInteger(ctx, str, base, startPtr) {
  if (ctx.bi !== true)
    int: {
      let val = parseInt(str, base);
      if (!Number.isSafeInteger(val)) {
        if (ctx.bi)
          break int;
        TomlError.x("integer value cannot be represented losslessly", ctx, startPtr);
      }
      return val;
    }
  return base === 10 ? BigInt(str) : BigInt((base === 2 ? "0b" : base === 8 ? "0o" : "0x") + str);
}
function parseDate(ctx, c, endChr) {
  let startPtr = ctx.p++, unsafeSeparator;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++)) || !isDigit(ctx.s.charCodeAt(ctx.p++))) {
    return parseNumber(ctx, ctx.p = startPtr, c, 0, endChr);
  }
  ctx.p += 5;
  if (!isDigit(ctx.s.charCodeAt(ctx.p++)))
    TomlError.x("invalid date-time: date part is malformed", ctx, startPtr);
  if (ctx.p >= ctx.s.length || ((c = ctx.s.charCodeAt(ctx.p)) !== 32 || (unsafeSeparator = true, !isDigit(ctx.s.charCodeAt(ctx.p + 1)))) && c !== 84 && c !== 116) {
    let t2 = ctx.s.slice(startPtr, ctx.p);
    return readDate(ctx, t2, 3, false, startPtr);
  }
  if (ctx.s.charCodeAt(ctx.p += 3) !== 58)
    TomlError.x("invalid date-time: time part is malformed", ctx, startPtr);
  if (ctx.s.charCodeAt(ctx.p += 3) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  if (c = ctx.s.charCodeAt(ctx.p)) {
    if (c === 90 || c === 122) {
      let t2 = ctx.s.slice(startPtr, ++ctx.p);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, "[+00:00]");
    }
    if (c === 43 || c === 45) {
      let t2 = ctx.s.slice(startPtr, ctx.p += 6);
      return readDate(ctx, t2, 1, unsafeSeparator, startPtr, !ctx.ld && "[" + ctx.s.slice(ctx.p - 6, ctx.p) + "]");
    }
  }
  let t = ctx.s.slice(startPtr, ctx.p);
  return readDate(ctx, t, 2, unsafeSeparator, startPtr);
}
function parseTime(ctx, c, endChr) {
  let start = ctx.p;
  if (!isDigit(c) || !isDigit(ctx.s.charCodeAt(++ctx.p))) {
    return parseNumber(ctx, --ctx.p, c, 0, endChr);
  }
  if (ctx.s.charCodeAt(ctx.p += 4) === 58)
    ctx.p += 3;
  if (ctx.s.charCodeAt(ctx.p) === 46)
    while (isDigit(ctx.s.charCodeAt(++ctx.p)))
      ;
  let t = ctx.s.slice(start, ctx.p);
  return readDate(ctx, t, 4, false, start);
}
function readDate(ctx, str, type, unsafeDelim, errPtr, temporalSuffix) {
  if (ctx.ld) {
    let date = new TomlDate(str, type, unsafeDelim);
    if (!date.isValid())
      TomlError.x("invalid date", ctx, errPtr);
    return date;
  }
  try {
    if (temporalSuffix)
      str += temporalSuffix;
    switch (type) {
      case 1:
        return Temporal.ZonedDateTime.from(str);
      case 2:
        return Temporal.PlainDateTime.from(str);
      case 3:
        return Temporal.PlainDate.from(str);
      case 4:
        return Temporal.PlainTime.from(str);
    }
  } catch (e) {
    TomlError.x(e instanceof Error ? e.message : "" + e, ctx, errPtr);
  }
}

// node_modules/smol-toml/dist/util.js
function skipComment(ctx) {
  for (; ctx.p < ctx.s.length; ctx.p++) {
    let c = ctx.s.charCodeAt(ctx.p);
    if (c === 10)
      break;
    if (c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10) {
      ctx.p++;
      break;
    }
    if (c < 32 && c !== 9 || c === 127) {
      TomlError.x("control characters are not allowed in comments", ctx);
    }
  }
}
function skipVoid(ctx, banNewLines, banComments) {
  let c;
  while (ctx.p < ctx.s.length) {
    while (ctx.p < ctx.s.length && ((c = ctx.s.charCodeAt(ctx.p)) === 32 || c === 9 || !banNewLines && (c === 10 || c === 13 && ctx.s.charCodeAt(ctx.p + 1) === 10)))
      ctx.p++;
    if (banComments || c !== 35)
      break;
    skipComment(ctx);
  }
}

// node_modules/smol-toml/dist/struct.js
function parseKey(ctx, end = 61) {
  let startPtr;
  let state = 0;
  let parsed = [];
  let sliceStart;
  let c = ctx.s.charCodeAt(startPtr = ctx.p);
  do {
    if (c === end) {
      if (!state)
        TomlError.x("unexpected end of key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      return ctx.p++, parsed;
    } else if (c === 46) {
      if (!state)
        TomlError.x("illegal empty bare key", ctx);
      if (state === 1)
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
      state = 0;
    } else if (!state && (c === 34 || c === 39)) {
      if (c === ctx.s.charCodeAt(ctx.p + 1) && c === ctx.s.charCodeAt(ctx.p + 2))
        TomlError.x("illegal quoted key: multiline strings are not allowed", ctx);
      parsed.push(parseString(ctx));
      state = 2;
      ctx.p--;
    } else if (c === 32 || c === 9) {
      if (state === 1) {
        parsed.push(ctx.s.slice(sliceStart, ctx.p));
        state = 2;
      }
    } else if (state === 2 || c < 48 && c !== 45 || c > 57 && c < 65 || c > 90 && c < 97 && c !== 95 || c > 122) {
      TomlError.x("illegal character in key", ctx);
    } else if (!state) {
      state = 1;
      sliceStart = ctx.p;
    }
  } while (c = ctx.s.charCodeAt(++ctx.p));
  TomlError.x("incomplete key-value: cannot find end of key", ctx, startPtr);
}
function parseInlineTable(ctx) {
  let startPtr = ctx.p++;
  let res = /* @__PURE__ */ Object.create(null);
  let seen = /* @__PURE__ */ new Set();
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 125) {
      ctx.p++;
      return res;
    }
    let k;
    let t = res;
    let hasOwn = false;
    let errPtr = ctx.p;
    let key = parseKey(ctx);
    for (let i = 0; i < key.length; i++) {
      if (i)
        t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      k = key[i];
      if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
        TomlError.x("trying to redefine an already defined value", ctx, errPtr);
      }
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor")) {
        t = ctx.uk !== 1 && TomlError.x("document contains an unsafe property", ctx, errPtr);
        break;
      }
      if (!hasOwn && unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
      }
    }
    if (hasOwn) {
      TomlError.x("trying to redefine an already defined value", ctx, errPtr);
    }
    skipVoid(ctx, true, true);
    let value = extractValue(
      ctx,
      125
      /* } */
    );
    if (t && typeof (t[k] = value) === "object")
      seen.add(value);
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 125) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished table", ctx, startPtr);
}
function parseArray(ctx) {
  let startPtr = ctx.p++;
  let res = [];
  let c;
  while (ctx.p < ctx.s.length) {
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p)) === 93) {
      ctx.p++;
      return res;
    }
    res.push(extractValue(
      ctx,
      93
      /* ] */
    ));
    skipVoid(ctx);
    if ((c = ctx.s.charCodeAt(ctx.p++)) === 93) {
      return res;
    }
    if (c !== 44)
      TomlError.x("expected comma or end of structure", ctx, ctx.p - 1);
  }
  TomlError.x("unfinished array", ctx, startPtr);
}

// node_modules/smol-toml/dist/parse.js
function peekTable(ctx, key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      let unsafe = k === "__proto__";
      if (ctx.uk && (unsafe || k === "constructor"))
        return false;
      if (unsafe) {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: /* @__PURE__ */ Object.create(null)
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = /* @__PURE__ */ Object.create(null));
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: /* @__PURE__ */ Object.create(null) };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = /* @__PURE__ */ Object.create(null);
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function validateTablePeek(ctx, peek, ptr) {
  if (peek === null || ctx.uk === 2)
    TomlError.x(peek === null ? "trying to redefine an already defined table or value" : "document contains an unsafe property", ctx, ptr);
}
function parse(toml, options = {}) {
  let ctx = {
    s: toml,
    p: 0,
    d: options.maxDepth ?? 1e3,
    bi: options.integersAsBigInt ?? false,
    ld: options.useLegacyDate ?? true,
    uk: options.unsafeKeyBehaviour === "throw" ? 2 : options.unsafeKeyBehaviour === "drop" ? 1 : 0
  };
  let res = /* @__PURE__ */ Object.create(null);
  let meta = /* @__PURE__ */ Object.create(null);
  let tmp;
  let skipping = false;
  let tbl = res;
  let m = meta;
  if (toml.charCodeAt(0) === 65279)
    ctx.p++;
  skipVoid(ctx);
  while (ctx.p < toml.length) {
    if (toml.charCodeAt(ctx.p) === 91) {
      let isTableArray = toml.charCodeAt(++ctx.p) === 91;
      tmp = ctx.p += +isTableArray;
      skipping = false;
      let k = parseKey(
        ctx,
        93
        /* ] */
      );
      if (isTableArray) {
        if (toml.charCodeAt(ctx.p) !== 93) {
          TomlError.x("expected end of table array declaration", ctx);
        }
        ctx.p++;
      }
      let p = peekTable(
        ctx,
        k,
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        validateTablePeek(ctx, p, tmp);
        skipping = true;
      } else {
        m = p[2];
        tbl = p[1];
      }
    } else {
      tmp = ctx.p;
      let k = parseKey(ctx);
      let p = peekTable(
        ctx,
        k,
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p && !skipping)
        validateTablePeek(ctx, p, tmp);
      skipVoid(ctx, true, true);
      let v = extractValue(ctx, void 0);
      if (p && !skipping)
        p[1][p[0]] = v;
    }
    skipVoid(ctx, true);
    if (ctx.p < toml.length && (tmp = toml.charCodeAt(ctx.p)) !== 10 && (tmp !== 13 || toml.charCodeAt(ctx.p + 1) !== 10)) {
      TomlError.x("each key-value declaration must be followed by an end-of-line", ctx);
    }
    skipVoid(ctx);
  }
  return res;
}

// node_modules/smol-toml/dist/stringify.js
var HAS_WELLFORMED = !!"".isWellFormed;

// src/native-pets.ts
var BUILTIN_PET_CATALOG = [
  { id: "codex", displayName: "Codex", source: "builtin" },
  { id: "dewey", displayName: "Dewey", source: "builtin" },
  { id: "fireball", displayName: "Fireball", source: "builtin" },
  { id: "hoots", displayName: "Hoots", source: "builtin" },
  { id: "rocky", displayName: "Rocky", source: "builtin" },
  { id: "seedy", displayName: "Seedy", source: "builtin" },
  { id: "stacky", displayName: "Stacky", source: "builtin" },
  { id: "bsod", displayName: "BSOD", source: "builtin" },
  { id: "null-signal", displayName: "Null Signal", source: "builtin" }
];
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function selection(value, source) {
  return { selectedPetId: value, genpetSelected: source === "unavailable" ? null : value === "custom:genpet-companion", source, liveVerified: false };
}
async function optionalText(file) {
  try {
    return await readFile7(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw error;
  }
}
async function readSelection(home, errors) {
  let config;
  try {
    config = await optionalText(path10.join(home, "config.toml"));
  } catch {
    errors.push("config.toml: \u65E0\u6CD5\u8BFB\u53D6\u9009\u62E9\u8BBE\u7F6E");
    return selection(null, "unavailable");
  }
  if (config !== void 0) {
    let parsed;
    try {
      parsed = parse(config, { integersAsBigInt: true });
    } catch {
      errors.push("config.toml: TOML \u683C\u5F0F\u65E0\u6548\uFF0C\u65E0\u6CD5\u786E\u5B9A\u9009\u62E9\u8BBE\u7F6E");
      return selection(null, "unavailable");
    }
    const desktop = parsed.desktop;
    if (desktop !== void 0 && !isRecord(desktop)) {
      errors.push("config.toml: desktop \u5FC5\u987B\u662F\u8868");
      return selection(null, "unavailable");
    }
    if (isRecord(desktop) && Object.hasOwn(desktop, "selected-avatar-id")) {
      const value = desktop["selected-avatar-id"];
      if (typeof value !== "string") {
        errors.push("config.toml: selected-avatar-id \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
        return selection(null, "unavailable");
      }
      return selection(value, "config");
    }
  }
  let legacy;
  try {
    legacy = await optionalText(path10.join(home, ".codex-global-state.json"));
  } catch {
    errors.push(".codex-global-state.json: \u65E0\u6CD5\u8BFB\u53D6\u65E7\u9009\u62E9\u8BBE\u7F6E");
    return selection(null, "unavailable");
  }
  if (legacy !== void 0) {
    try {
      const state = JSON.parse(legacy);
      if (!isRecord(state)) throw new Error("Invalid state");
      const atoms = state["electron-persisted-atom-state"];
      if (atoms !== void 0 && !isRecord(atoms)) throw new Error("Invalid atoms");
      if (isRecord(atoms) && Object.hasOwn(atoms, "selected-avatar-id")) {
        const value = atoms["selected-avatar-id"];
        if (value !== null && typeof value !== "string") throw new Error("Invalid selection");
        return selection(value, "legacy");
      }
    } catch {
      errors.push(".codex-global-state.json: \u65E7\u9009\u62E9\u8BBE\u7F6E\u683C\u5F0F\u65E0\u6548");
      return selection(null, "unavailable");
    }
  }
  return selection("codex", "default");
}
async function localPets(home, errors) {
  const pets = /* @__PURE__ */ new Map();
  for (const [directory, filename] of [["avatars", "avatar.json"], ["pets", "pet.json"]]) {
    let entries;
    try {
      entries = await readdir2(path10.join(home, directory), { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") errors.push(`${directory}: \u65E0\u6CD5\u8BFB\u53D6\u5BA0\u7269\u76EE\u5F55`);
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const label = `${directory}/${entry.name}/${filename}`;
      try {
        const text2 = await optionalText(path10.join(home, directory, entry.name, filename));
        if (text2 === void 0) continue;
        const manifest = JSON.parse(text2);
        if (!isRecord(manifest)) throw new Error("Invalid manifest");
        for (const key of ["id", "displayName"]) {
          if (manifest[key] !== void 0 && (typeof manifest[key] !== "string" || !manifest[key].trim())) throw new Error("Invalid name");
        }
        const id = `custom:${entry.name}`;
        const displayName = (manifest.displayName ?? manifest.id ?? entry.name).trim();
        pets.set(id, { id, displayName, source: "local" });
      } catch {
        errors.push(`${label}: \u65E0\u6CD5\u8BFB\u53D6\u6709\u6548\u5BA0\u7269\u6E05\u5355`);
      }
    }
  }
  return [...pets.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
async function getNativePetCatalog(home = process.env.CODEX_HOME || path10.join(homedir5(), ".codex")) {
  const errors = [];
  const selected = await readSelection(home, errors);
  const local = await localPets(home, errors);
  return {
    pets: [...BUILTIN_PET_CATALOG.map((pet) => ({ ...pet })), ...local],
    selection: selected,
    activation: { immediate: false, reason: "\u5F53\u524D\u4E3A\u78C1\u76D8\u5FEB\u7167\uFF1B\u5373\u65F6\u5207\u6362\u9700\u8981\u53EF\u7528\u7684 Codex app-tools \u4F1A\u8BDD\u901A\u9053\u3002" },
    ...errors.length ? { errors } : {}
  };
}

// src/debugger.ts
import { spawn as spawn2 } from "node:child_process";
import path11 from "node:path";
async function launchDebugger(port = Number(process.env.GENPET_PORT || (packageHost() === "dots" ? 47832 : 47831))) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid debugger port");
  const url = `http://127.0.0.1:${port}`, root = new Store(void 0, false, packageHost()).root;
  async function inspect() {
    let response;
    try {
      response = await fetch(url + "/api/health", { signal: AbortSignal.timeout(500) });
    } catch {
      return false;
    }
    const value = await response.json().catch(() => null);
    if (value?.service !== "genpet-debugger" || value.root !== root) throw new Error("Debugger port belongs to another service or data directory");
    return true;
  }
  if (await inspect()) return { url, reused: true };
  const child = spawn2(process.execPath, [path11.join(import.meta.dirname, "debugger-server.js")], { detached: true, stdio: "ignore", env: { ...process.env, GENPET_PORT: String(port), GENPET_DATA_DIR: path11.resolve(dataRoot()) } });
  let failure;
  child.once("error", (error) => {
    failure = error;
  });
  child.unref();
  for (let i = 0; i < 50; i++) {
    if (failure) throw failure;
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (await inspect()) return { url, reused: false };
    if (child.exitCode !== null) throw new Error("Debugger failed to start");
  }
  throw new Error("Debugger startup timed out");
}

// src/naming.ts
function namingDue(state) {
  return !state.pending && !!state.pet && state.pet.stage !== "egg" && state.pet.naming?.status === "unasked";
}
function target(state, petId) {
  identifier(petId, "petId");
  if (!state.pet || state.pet.id !== petId) throw new Error("Naming reply belongs to another or missing pet");
  if (state.pending) throw new Error("Finish the unfinished story before naming this pet");
  return state.pet;
}
async function markNameAsked(store2, petId) {
  return store2.transaction((state) => {
    const pet = target(state, petId);
    if (!namingDue(state)) return { petId, asked: false, status: pet.naming?.status ?? "named" };
    pet.naming = { status: "asked", askedAt: Date.now() };
    return { petId, asked: true, status: pet.naming.status };
  });
}
async function namePet(store2, petId, userName) {
  const name = text(userName, "user supplied name");
  if (name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error("Name must be one line of at most 100 characters");
  return store2.transaction((state) => {
    const pet = target(state, petId);
    if (pet.name === name && pet.naming?.status === "named") return pet;
    pet.name = name;
    pet.naming = { status: "named", namedAt: Date.now(), ...pet.naming?.askedAt ? { askedAt: pet.naming.askedAt } : {} };
    pet.revision++;
    return pet;
  });
}
async function deferName(store2, petId) {
  return store2.transaction((state) => {
    const pet = target(state, petId);
    if (pet.stage === "egg") throw new Error("The automatic naming invitation follows a completed hatch");
    if (pet.naming?.status === "named" || !pet.naming) throw new Error("This pet already has a saved name");
    pet.naming = { ...pet.naming, status: "deferred" };
    return { petId, status: pet.naming.status };
  });
}

// src/cli.ts
var argv = process.argv.slice(2);
var demo = argv[0] === "--demo";
if (demo) argv.shift();
var [command, ...args] = argv;
var store = new Store(void 0, demo, packageHost());
var jsonFile = async (file) => {
  if (!path12.isAbsolute(file ?? "")) throw new Error("JSON input requires an absolute file");
  return JSON.parse(await readFile8(file, "utf8"));
};
try {
  let output;
  switch (command) {
    case "status": {
      const state = await store.peek(), legacyFile = !state.pet ? await store.legacyCandidate() : null;
      output = { ...state, namingDue: namingDue(state), dataDirectory: store.root, ...legacyFile ? { legacyFile } : {} };
      break;
    }
    case "begin-story":
      output = await beginStory(store, args[0] || `manual:${randomUUID8()}`, args[1] || "story", args[2]);
      break;
    case "plan-story":
      output = await planStory(store, args[0], await jsonFile(args[1]));
      break;
    case "finish-story":
      output = await finishStory(store, args[0]);
      break;
    case "name-pet":
      output = await namePet(store, args[0], args[1]);
      break;
    case "name-asked":
      output = await markNameAsked(store, args[0]);
      break;
    case "defer-name":
      output = await deferName(store, args[0]);
      break;
    case "cancel-story":
      output = await store.transaction((state) => {
        const pending = pendingFor(state, args[0]);
        if (pending.mode === "initialization" && pending.plan) throw new Error("Initialization genes are saved; resume it or explicitly reset the pet");
        state.pending = null;
        return { cancelled: pending.id };
      });
      break;
    case "art-request":
      output = artRequest(await store.peek());
      break;
    case "accept-art":
      output = await acceptArt(store, { requestId: args[0], file: args[1], kind: args[2], provenance: args[3], description: args[4] });
      break;
    case "install-native":
    case "refresh-native":
      output = await installNative(store);
      break;
    case "host-request":
      output = hostRequest(await store.peek());
      break;
    case "host-result":
      output = await recordHostResult(store, args[0], await jsonFile(args[1]));
      break;
    case "bind-avatar":
      output = await bindAvatar(store, args[0]);
      break;
    case "configure-host":
      output = await configureAdapter(store, await jsonFile(args[0]));
      break;
    case "publish":
      output = store.host === "desktop" ? await installNative(store) : await publishDots(store);
      break;
    case "prompt":
      output = { prompt: readPrompt(args[0]) };
      break;
    case "unit-request":
      output = unitRequest(args[0], await jsonFile(args[1]));
      break;
    case "verify-unit":
      output = { unit: args[0], contractValid: true, ...validateUnitResult(args[0], await jsonFile(args[1])) };
      break;
    case "record-step":
      output = await recordStep(store, args[0], args[1], await jsonFile(args[2]));
      break;
    case "due":
      output = dueStory(await store.peek(), Date.now(), args[0]);
      break;
    case "schedule": {
      const timezone = text(args[0], "timezone"), reference = text(args[1], "schedule reference");
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      output = await store.transaction((state) => state.schedule = { timezone, reference, times: ["07:00", "12:00", "16:00", "21:00"] });
      break;
    }
    case "story-output": {
      const state = await store.peek(), story = args[0] ? state.stories.find((story2) => story2.id === args[0]) : state.stories.at(-1);
      if (!story) throw new Error("No completed story");
      output = { text: story.text, media: state.art.filter((art) => story.mediaIds.includes(art.id)), appearance: state.art.find((art) => art.id === story.appearanceId), naming: { due: namingDue(state), petId: state.pet?.id, status: state.pet?.naming?.status ?? "named" }, prompt: readPrompt("output") };
      break;
    }
    case "migrate-legacy":
      output = await migrateLegacy(store, args[0], await jsonFile(args[1]));
      break;
    case "reset":
      output = await resetPet(store, args[0] || randomUUID8());
      break;
    case "debugger":
      output = await launchDebugger();
      break;
    case "switch-pet": {
      if (demo || store.host !== "desktop") throw new Error("switch-pet requires the desktop package and cannot run with --demo");
      const usage = "Usage: switch-pet [PET_ID|--current|--list|--help]";
      if (args.length > 1) throw new Error(usage);
      const target2 = args[0] ?? "--current";
      if (target2 === "--help") {
        output = { usage, examples: ["switch-pet --list", "switch-pet --current", "switch-pet dewey"] };
        break;
      }
      if (target2 === "--current") {
        const current = await readNativePetLive();
        if (!current.available) throw new Error(current.reason);
        output = current;
        break;
      }
      if (target2.startsWith("-") && target2 !== "--list") throw new Error(usage);
      const catalog = await getNativePetCatalog();
      if (target2 === "--list") {
        output = { pets: catalog.pets, ...catalog.errors ? { errors: catalog.errors } : {} };
        break;
      }
      if (!catalog.pets.some((pet) => pet.id === target2)) throw new Error(`Unknown pet ID: ${target2}. Use switch-pet --list.`);
      output = await selectNativePetLive(target2);
      break;
    }
    default:
      throw new Error("Commands: status, begin-story [TRIGGER_ID] [initialization|story|grow], plan-story OPERATION_ID PLAN_JSON, art-request, accept-art REQUEST_ID FILE portrait|atlas|avatar|story|artifact PROVENANCE [DESCRIPTION], publish, host-request, host-result OPERATION_ID RESULT_JSON, bind-avatar AVATAR_ID, configure-host ADAPTER_JSON, finish-story OPERATION_ID, story-output [STORY_ID], name-pet PET_ID USER_NAME, name-asked PET_ID, defer-name PET_ID, due [TIMEZONE], schedule TIMEZONE REFERENCE, prompt MODULE, unit-request UNIT INPUT_JSON, verify-unit UNIT RESULT_JSON, record-step OPERATION_ID UNIT RESULT_JSON, migrate-legacy V1_FILE DESIGN_JSON, cancel-story OPERATION_ID, reset [OPERATION_ID], debugger, switch-pet [PET_ID|--current|--list|--help]");
  }
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
/*! Bundled license information:

smol-toml/dist/error.js:
smol-toml/dist/primitive.js:
smol-toml/dist/date.js:
smol-toml/dist/extract.js:
smol-toml/dist/util.js:
smol-toml/dist/struct.js:
smol-toml/dist/parse.js:
smol-toml/dist/stringify.js:
smol-toml/dist/index.js:
  (*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   *)
*/
