 /**
 * This file is part of Morphy library
 *
 * Copyright c 2007-2008 Kamaev Vladimir <heromantor@users.sourceforge.net>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the
 * Free Software Foundation, Inc., 59 Temple Place - Suite 330,
 * Boston, MA 02111-1307, USA.
 */
var js = require('../../jsutil');
var fs = require('fs');
var util = require('util');
var Buffer = require('buffer').Buffer;
/**
 * This file is autogenerated at Wed, 14 Oct 2009 01:34:00 +0400, don`t change it!
 */
function Morphy_Graminfo_File(resource, header)/* extends Morphy_Graminfo*/ {
	
	this.resource = resource;
	this.header = header;
	this.ends = '\0\0' /*str_repeat("\0", header['char_size'] + 1)*/;
	this.ends_size = this.ends.length;
	
    this.getGramInfoHeaderSize = function() {
        return 20;
    };

    this.readGramInfoHeader = function(offset) {
        fseek(this.resource, offset); 
        
        result = unpack(
            'vid/vfreq/vforms_count/vpacked_forms_count/vancodes_count/vancodes_offset/vancodes_map_offset/vaffixes_offset/vaffixes_size/vbase_size',
            fread(this.resource, 20) 
        );
        
        result['offset'] = offset;
        
        return result;
    };

    this.readAncodesMap = function(info) {
        // TODO: this can be wrong due to aligning ancodes map section
        offset = info['offset'] + 20 + info['forms_count'] * 2;
		
//        fseek(this.resource, offset); 
            
        forms_count = info['packed_forms_count'];
//        return unpack("vforms_count",  fread(this.resource, forms_count * 2));
        
        var buf = new Buffer(forms_count * 2);
		var readed = fs.readSync(this.resource, buf, 0, forms_count * 2, offset);
		var result = js.unpack("vforms_count",  buf);
		return result;
    };

    this.splitAncodes = function(ancodes, map) {
        var result = [];
        for(i = 0, c = map.length, j = 0; i <= c; i++) {
            res = [];
            
            for(k = 0, kc = map[i]; k < kc; k++, j++) {
                res.push(ancodes[j]);
            }
            if (res.length>0)
            	result.push(res);
        }
        
        return result;
    };
    
    this.readAncodes = function(info) {
        // TODO: this can be wrong due to aligning ancodes section
        offset = info['offset'] + 20;


//        fseek(this.resource, offset);
            
        forms_count = info['forms_count'];
        var buf = new Buffer(forms_count * 2);
		var readed = fs.readSync(this.resource, buf, 0, forms_count * 2, offset);
		
//        ancodes = unpack("vforms_count", fread(this.resource, forms_count * 2));
        ancodes = js.unpack("vforms_count", buf);
        
        map = this.readAncodesMap(info);
        var result = this.splitAncodes(ancodes, map); //DV
        return result;
    };
    
    this.readFlexiaData = function(info) {
        offset = parseInt(info['offset'], 10) + 20;
        if(info['affixes_offset']) {
            offset += info['affixes_offset'];
        } else {
            offset += info['forms_count'] * 2 + info['packed_forms_count'] * 2;
        }
        var len = info['affixes_size'] - this.ends_size;
        var buf = new Buffer(len);
		var readed = fs.readSync(this.resource, buf, 0, len, offset);
		var result = buf.toString().split(this.ends);
		return result;
    };
    
    this.readAllGramInfoOffsets = function() {
        return this.readSectionIndex(this.header['flex_index_offset'], this.header['flex_count']);
    };

    this.readSectionIndex = function(offset, count) {       
        fseek(this.resource, offset); 
        return array_values(unpack("Vcount", fread(this.resource, count * 4)));
    };

    this.readAllFlexia = function() {
        var result = [];
        
        offset = this.header['flex_offset'];
        
        for(var size in this.readSectionIndexAsSize(this.header['flex_index_offset'], this.header['flex_count'], this.header['flex_size'])) {
            header = this.readGramInfoHeader(offset);
            affixes = this.readFlexiaData(header);
            ancodes = this.readAncodes(header, true);

            result[header['id']] = {
                'header' : header,
                'affixes' : affixes,
                'ancodes' : ancodes
            };

            offset += size;
        }
        
        return result;
    };
    
    this.readAllPartOfSpeech = function() {
        var result = [];
        
        offset = this.header['poses_offset'];
        
        for(var size in this.readSectionIndexAsSize(this.header['poses_index_offset'], this.header['poses_count'], this.header['poses_size'])) {
            fseek(this.resource, offset); 
            
            res = unpack(
                'vid/Cis_predict',
                fread(this.resource, 3) 
            );
            
            result[res['id']] = {
                'is_predict' : /*(bool)*/res['is_predict'],
                'name' : this.cleanupCString(fread(this.resource, size - 3))
            };

            offset += size;
        }
        
        return result;
    };
    
    this.readAllGrammems = function() {
        var result = [];
        
        offset = this.header['grammems_offset'];
        
        for(var size in this.readSectionIndexAsSize(this.header['grammems_index_offset'], this.header['grammems_count'], this.header['grammems_size'])) {
            fseek(this.resource, offset); 
            
            res = unpack(
                'vid/Cshift',
                fread(this.resource, 3) 
            );
            
            result[res['id']] = {
                'shift' : res['shift'],
                'name' : this.cleanupCString(fread(this.resource, size - 3))
            };

            offset += size;
        }
        
        return result;
    };

    this.readAllAncodes = function() {
        var result = [];
        
        offset = this.header['ancodes_offset'];
        fseek(this.resource, offset); 
        
        for(var i = 0; i < this.header['ancodes_count']; i++) {
            res = unpack('vid/vpos_id', fread(this.resource, 4));
            offset += 4;
            
            /*list(, grammems_count) =*/ unpack('v', fread(this.resource, 2));
            offset += 2;
            
            result[res['id']] = {
                'pos_id' : res['pos_id'],
                'grammem_ids' : grammems_count ? 
                    array_values(unpack("vgrammems_count", fread(this.resource, grammems_count * 2))) :
                    [],
                'offset' : offset
            };
            
            offset += grammems_count * 2;
        }

        return result;
    };  
}
exports.Module = Morphy_Graminfo_File;