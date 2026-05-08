import { SLuaUUID, SLuaVec, SLuaQuaternion, PRIM, SLuaPrimitive, SLuaEntity, SLuaAvatar } from "./sl-sim";

export function handleSLuaVMQuery(query: string): string {
    console.log("handleSLuaVMQuery", query);
    const data = JSON.parse(query) satisfies { query: string };
    let result = null;
    try {
        switch(data.query) {
            case 'event_name':
                result = `ok`;
                break;
            case "ll":
                result = handleLLQuery(data.name, data.args);
                break;
            default:
                result = `["Error","unknown query",${query}]`;
                break;
        }
    } catch (e) {
        result = `Error: ${e}`;
    }
    console.log("handleSLuaVMQuery query", query, "result", result);
    return result;
}

function handleLLQuery(name: string, args: any[]): string {
    console.log("handleLLQuery", name, args);
    if(!(args instanceof Array)) {
        throw "args must be an array";
    }
    args = castArgs(args);
    try {
        return JSON.stringify(LLQuery(name, args));
    } catch (e) {
        throw ` ll.${name} ${e}`;
    }
}

function castArg(arg: any): any {
    if(typeof arg === "string" && arg.startsWith("!")) {
        const tag = arg.substring(0, 2);
        switch(tag) {
            case "!v":
                return SLuaVec.fromSLJson(arg);
            case "!u":
                return SLuaUUID.fromSLJson(arg);
            case "!q":
                return SLuaQuaternion.fromSLJson(arg);
            case "!n":
                return null;
            case "!!":
                return arg.substring(1);
            default:
                throw `Unknown prefix: ${tag}`;
        }
    }
    if(Array.isArray(arg)) {
        return arg.map(castArg);
    }
    return arg;
}

function castArgs(args: any[]): any[] {
    return args.map(castArg);
}

const state = {
    prim: new SLuaPrimitive(),
    prims: new Map<SLuaUUID, SLuaPrimitive>(),
    avatars: new Map<SLuaUUID, SLuaAvatar>(),
};
state.prims.set(state.prim.id, state.prim);

function findByKey(key: string): SLuaEntity|null {
    for(const [id, obj] of state.prims.entries()) {
        if(obj.id.value == key) return obj;
        for(const prim of obj.prims) {
            if(prim.id.value == key) return prim;
        }
    }
    for(const [id, obj] of state.avatars.entries()) {
        if(obj.id.value == key) return obj;
    }
    return null;
}


function mapType(arg: any): any {
    const typ = typeof arg;
    switch(typ) {
        case "number":
        case "string":
        case "boolean":
            return typ;
        case "object":
            if(Array.isArray(arg)) {
                return "list";
            }
            if(arg instanceof SLuaVec) {
                return "vector";
            }
            if(arg instanceof SLuaUUID) {
                return "uuid";
            }
            if(arg instanceof SLuaQuaternion) {
                return "quaternion";
            }
            break;
        default:
            return typ;
    }
    throw `Unknown type: ${typ}`;
}

function argCheck(args:any[], types:(string|string[])[] = []) : any[]{
    if(args.length !== types.length) {
        throw `Expected ${types.length} arguments, got ${args.length}`;
    }
    const results = [];
    for(const i in types) {
        const typ = types[i];
        const arg = args[i];
        const argType = mapType(arg);
        if(typeof typ === "string") {
            if(typ !== argType) {
                throw `Expected '${typ}' at arg #${+i+1}, got '${argType}'`;
            }
        } else {
            if(!typ.includes(argType)) {
                throw `Expected '${typ.join("' or '")}' at arg #${+i+1}, got '${argType}'`;
            }
        }
        results.push(arg);
    }
    return results;
}

function mapLink(link:number): number {
    if(link == -4) link = 1;
    return link;
}

function getPrimParams(object: SLuaPrimitive, link:number, params: number[]): any[] {
    argCheck(params,Array(params.length).fill("number"));
    console.log("getPrimParams", object, link, params);
    link = mapLink(link);
    let prim = object.prim(link);
    const results: any[] = [];
    for(let i=0;i<params.length;i++) {
        const param = params[i];
        if(!prim) {
            throw `Link ${link} is not a primitive`;
        }
        switch(param) {
            case PRIM.NAME:
                results.push(prim.name);
                continue;
            case PRIM.POS_LOCAL:
                results.push(prim.localPos);
                continue;
            case PRIM.POSITION:
                results.push(prim.pos);
                continue;
            case PRIM.ROT_LOCAL:
                results.push(prim.localRot);
                continue;
            case PRIM.ROTATION:
                results.push(prim.rot);
                continue;
            case PRIM.DESC:
                results.push(prim.desc);
                continue;
            case PRIM.LINK_TARGET:
                i++;
                link = mapLink(params[i]);
                prim = object.prim(link);
                continue;
        }
        if(!(prim instanceof SLuaPrimitive)) {
            throw `Param ${param} error, cannot be accessed for avatars`;
        }
        switch(param) { 
            case PRIM.ALLOW_UNSIT:
                results.push((prim.sitFlags & 2) !== 0);
                continue;
            case PRIM.ALPHA_MODE:
                i++;
                results.push(prim.faces[params[i]].alphaMode);
                continue;
            case PRIM.BUMP_SHINY:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.CAST_SHADOWS:
                results.push(null); // TODO
                continue;
            case PRIM.CLICK_ACTION:
                results.push(prim.clickAction);
                continue;
            case PRIM.COLLISION_SOUND:
                results.push(null); // TODO
                continue;
            case PRIM.COLOR:{
                i++;
                const face = params[i];
                results.push(prim.faces[face].color,prim.faces[face].alpha);
                continue;
            }
            case PRIM.DAMAGE:
                results.push(prim.damage,prim.damageType);
                continue;

            case PRIM.FLEXIBLE:
                results.push(
                    prim.flexibe.enabled,
                    prim.flexibe.softness,
                    prim.flexibe.gravity,
                    prim.flexibe.friction,
                    prim.flexibe.wind,
                    prim.flexibe.tension,
                    prim.flexibe.force,
                );
                continue;
            case PRIM.FULLBRIGHT:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.GLOW:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.GLTF_BASE_COLOR:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.GLTF_EMISSIVE:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.GLTF_METALLIC_ROUGHNESS:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.GLTF_NORMAL:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.HEALTH:
                results.push(prim.health);
                continue;
            case PRIM.MATERIAL:
                results.push(prim.material);
                continue;
            case PRIM.NORMAL:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.OMEGA:
                results.push(null); // TODO
                continue;
            case PRIM.PHANTOM:
                results.push(prim.phantom);
                continue;
            case PRIM.PHYSICS:
                results.push(prim.physics);
                continue;
            case PRIM.PHYSICS_SHAPE_TYPE:
                results.push(prim.physicsShapeType);
                continue;
            case PRIM.POINT_LIGHT:
                results.push(null); // TODO
                continue;
            case PRIM.PROJECTOR:
                results.push(null); // TODO
                continue;
            case PRIM.REFLECTION_PROBE:
                results.push(null); // TODO
                continue;
            case PRIM.RENDER_MATERIAL:
                results.push(null); // TODO
                continue;
            case PRIM.SCRIPTED_SIT_ONLY:
                results.push((prim.sitFlags & 4) != 0);
                continue;
            case PRIM.SIT_FLAGS:
                results.push(prim.sitFlags);
                continue;
            case PRIM.SIT_TARGET:
                results.push((prim.sitFlags & 1)!=0,prim.sitPos,prim.sitRot);
                continue;
            case PRIM.SIZE:
                results.push(prim.size);
                continue;
            case PRIM.SLICE:
                results.push(prim.slice);
                continue;
            case PRIM.SPECULAR:
                i++;
                results.push(null); // TODO
                continue;
            case PRIM.TEMP_ON_REZ:
                results.push(prim.temp);
                continue;
            case PRIM.TEXGEN:
                i++;
                results.push(prim.faces[params[i]].mode);
                continue;
            case PRIM.TEXT:
                results.push(prim.text,prim.textColor,prim.textAlpha);
                continue;
            case PRIM.TEXTURE: {
                i++;
                const face = prim.faces[params[i]];
                results.push(face.texture,face.repeats,face.offset,face.rotation);
                continue;
            }
            case PRIM.TYPE:
                results.push(...prim.typeData);
                continue;
            default:
                throw `Unknown parameter: ${param}`;
        }

    }
    return results;

}

function LLQuery(name: string, args: any[]): any {
  switch(name) {
    case "Abs":
        return Math.abs(argCheck(args, ["number"])[0]);
    case "Acos":
        return Math.acos(argCheck(args, ["number"])[0]);
    case "AddToLandBanList":
        return null;
    case "AddToLandPassList":
        return null;
    case "AdjustDamage":
        throw `AdjustDamage not implemented`;
    case "AdjustSoundVolume":
        throw `AdjustSoundVolume not implemented`;
    case "AgentInExperience":
        argCheck(args, ["uuid"]);
        return Math.random() > 0.5;
    case "AllowInventoryDrop":
        argCheck(args, ["boolean"]);
        return null;
    case "AngleBetween":
        argCheck(args, ["quaternion", "quaternion"]);
        return Math.random() * 2 * Math.PI;
    case "ApplyImpulse":
        argCheck(args, ["vector", "boolean"]);
        return null;
    case "ApplyRotationalImpulse":
        argCheck(args, ["quaternion", "boolean"]);
        return null;
    case "Asin":
        return Math.asin(argCheck(args, ["number"])[0]);
    case "Atan2":
        argCheck(args, ["number", "number"]);
        return Math.atan2(args[0], args[1]);
    case "AttachToAvatar":
        argCheck(args, ["number"]);
        return null;
    case "AttachToAvatarTemp":
        argCheck(args, ["number"]);
        return null;
    case "AvatarOnLinkSitTarget":
        argCheck(args, ["number"]);
        return new SLuaUUID(crypto.randomUUID());
    case "AvatarOnSitTarget":
        argCheck(args);
        return new SLuaUUID(crypto.randomUUID());
    case "Axes2Rot":
        argCheck(args, ["vector", "vector", "vector"]);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "AxisAngle2Rot":
        argCheck(args, ["vector", "number"]);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "Base64ToInteger":
        argCheck(args, ["string"]);
        return 0;
    case "Base64ToString":
        argCheck(args, ["string"]);
        return "";
    case "BreakAllLinks":
        argCheck(args);
        return null;
    case "BreakLink":
        argCheck(args, ["number"]);
        return null;
    case "CSV2List":
        argCheck(args, ["string"]);
        return [];
    case "CastRay":
        argCheck(args, ["vector", "vector", "list"]);
        return [];
    case "Ceil":
        argCheck(args, ["number"]);
        return 0;
    case "Char":
        argCheck(args, ["number"]);
        return "";
    case "ClearCameraParams":
        argCheck(args);
        return null;
    case "ClearExperience":
        argCheck(args, ["uuid", "uuid"]);
        return null;
    case "ClearExperiencePermissions":
        argCheck(args, ["uuid"]);
        return null;
    case "ClearLinkMedia":
        argCheck(args, ["number", "number"]);
        return 0;
    case "ClearPrimMedia":
        argCheck(args, ["number"]);
        return 0;
    case "CloseRemoteDataChannel":
        argCheck(args, ["uuid"]);
        return null;
    case "Cloud":
        argCheck(args, ["vector"]);
        return 0.0;
    case "CollisionFilter":
        argCheck(args, ["string", "uuid", "number"]);
        return null;
    case "CollisionSound":
        argCheck(args, ["string", "number"]);
        return null;
    case "CollisionSprite":
        argCheck(args, ["string"]);
        return null;
    case "ComputeHash":
        argCheck(args, ["string", "string"]);
        return "";
    case "CreateCharacter":
        argCheck(args, ["list"]);
        return null;
    case "CreateKeyValue":
        argCheck(args, ["string", "string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "CreateLink":
        argCheck(args, ["uuid", "number"]);
        return null;
    case "Damage":
        argCheck(args, ["uuid", "number", "number"]);
        return null;
    case "DataSizeKeyValue":
        argCheck(args);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "DeleteCharacter":
        argCheck(args);
        return null;
    case "DeleteKeyValue":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "DeleteSubList":
        argCheck(args, ["list", "number", "number"]);
        return [];
    case "DeleteSubString":
        argCheck(args, ["string", "number", "number"]);
        return "";
    case "DerezObject":
        argCheck(args, ["uuid", "number"]);
        return 0;
    case "DetachFromAvatar":
        argCheck(args);
        return null;
    case "DetectedDamage":
        argCheck(args, ["number"]);
        return [];
    case "DetectedGrab":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedGroup":
        argCheck(args, ["number"]);
        return 0;
    case "DetectedKey":
        argCheck(args, ["number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "DetectedLinkNumber":
        argCheck(args, ["number"]);
        return 0;
    case "DetectedName":
        argCheck(args, ["number"]);
        return "";
    case "DetectedOwner":
        argCheck(args, ["number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "DetectedPos":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedRezzer":
        argCheck(args, ["number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "DetectedRot":
        argCheck(args, ["number"]);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "DetectedTouchBinormal":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedTouchFace":
        argCheck(args, ["number"]);
        return 0;
    case "DetectedTouchNormal":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedTouchPos":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedTouchST":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedTouchUV":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "DetectedType":
        argCheck(args, ["number"]);
        return 0;
    case "DetectedVel":
        argCheck(args, ["number"]);
        return new SLuaVec(0, 0, 0);
    case "Dialog":
        argCheck(args, ["uuid", "string", "list", "number"]);
        return null;
    case "Die":
        argCheck(args);
        throw "Dead";
    case "DumpList2String":
        argCheck(args, ["list", "string"]);
        return "";
    case "EdgeOfWorld":
        argCheck(args, ["vector", "vector"]);
        return 0;
    case "EjectFromLand":
        argCheck(args, ["uuid"]);
        return null;
    case "Email":
        argCheck(args, ["string", "string", "string"]);
        return null;
    case "EscapeURL":
        argCheck(args, ["string"]);
        return "";
    case "Euler2Rot":
        argCheck(args, ["vector"]);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "Evade":
        argCheck(args, ["uuid", "list"]);
        return null;
    case "ExecCharacterCmd":
        argCheck(args, ["number", "list"]);
        return null;
    case "Fabs":
        argCheck(args, ["number"]);
        return 0.0;
    case "FindNotecardTextCount":
        argCheck(args, ["string", "string", "list"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "FindNotecardTextSync":
        argCheck(args, ["string", "string", "number", "number", "list"]);
        return [];
    case "FleeFrom":
        argCheck(args, ["vector", "number", "list"]);
        return null;
    case "Floor":
        return Math.floor(argCheck(args, ["number"])[0]);
    case "ForceMouselook":
        argCheck(args, [["number","boolean"]]);
        return null;
    case "Frand":
        argCheck(args, ["number"]);
        return 0.0;
    case "GenerateKey":
        argCheck(args);
        return new SLuaUUID(crypto.randomUUID());
    case "GetAccel":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetAgentInfo":
        argCheck(args, ["uuid"]);
        return 0;
    case "GetAgentLanguage":
        argCheck(args, ["uuid"]);
        return "";
    case "GetAgentList":
        argCheck(args, ["number", "list"]);
        return [];
    case "GetAgentSize":
        argCheck(args, ["uuid"]);
        return new SLuaVec(0, 0, 0);
    case "GetAlpha":
        argCheck(args, ["number"]);
        return 0.0;
    case "GetAndResetTime":
        argCheck(args);
        return 0.0;
    case "GetAnimation":
        argCheck(args, ["uuid"]);
        return "";
    case "GetAnimationList":
        argCheck(args, ["uuid"]);
        return [];
    case "GetAnimationOverride":
        argCheck(args, ["string"]);
        return "";
    case "GetAttached":
        argCheck(args);
        return 0;
    case "GetAttachedList":
        argCheck(args, ["uuid"]);
        return [];
    case "GetAttachedListFiltered":
        argCheck(args, ["uuid", "list"]);
        return [];
    case "GetBoundingBox":
        argCheck(args, ["uuid"]);
        return [];
    case "GetCameraAspect":
        argCheck(args);
        return 0.0;
    case "GetCameraFOV":
        argCheck(args);
        return 0.0;
    case "GetCameraPos":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetCameraRot":
        argCheck(args);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "GetCenterOfMass":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetClosestNavPoint":
        argCheck(args, ["vector", "list"]);
        return [];
    case "GetColor":
        return state.prim.faces[argCheck(args,["number"])[0]].color;
    case "GetCreator":
        argCheck(args);
        return state.prim.creator;
    case "GetDate":
        argCheck(args);
        return "";
    case "GetDayLength":
        argCheck(args);
        return 0;
    case "GetDayOffset":
        argCheck(args);
        return 0;
    case "GetDisplayName":
        argCheck(args, ["uuid"]);
        return "";
    case "GetEnergy":
        argCheck(args);
        return 0.0;
    case "GetEnv":
        argCheck(args, ["string"]);
        return "";
    case "GetEnvironment":
        argCheck(args, ["vector", "list"]);
        return [];
    case "GetExperienceDetails":
        argCheck(args, ["uuid"]);
        return [];
    case "GetExperienceErrorMessage":
        argCheck(args, ["number"]);
        return "";
    case "GetExperienceList":
        argCheck(args, ["uuid"]);
        return [];
    case "GetForce":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetFreeMemory":
        argCheck(args);
        return 0;
    case "GetFreeURLs":
        argCheck(args);
        return 0;
    case "GetGMTclock":
        argCheck(args);
        return 0.0;
    case "GetGeometricCenter":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetHTTPHeader":
        argCheck(args, ["uuid", "string"]);
        return "";
    case "GetHealth":
        argCheck(args, ["uuid"]);
        return 0.0;
    case "GetInventoryAcquireTime":
        argCheck(args, ["string"]);
        return "";
    case "GetInventoryCreator":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetInventoryDesc":
        argCheck(args, ["string"]);
        return "";
    case "GetInventoryKey":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetInventoryName":
        argCheck(args, ["number", "number"]);
        return "";
    case "GetInventoryNumber":
        argCheck(args, ["number"]);
        return 0;
    case "GetInventoryPermMask":
        argCheck(args, ["string", "number"]);
        return 0;
    case "GetInventoryType":
        argCheck(args, ["string"]);
        return 0;
    case "GetLandOwnerAt":
        argCheck(args, ["vector"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetLinkKey":
        argCheck(args, ["number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetLinkMedia":
        argCheck(args, ["number", "number", "list"]);
        return [];
    case "GetLinkName":
        argCheck(args, ["number"]);
        return "";
    case "GetLinkNumber":
        argCheck(args);
        return 0;
    case "GetLinkNumberOfSides":
        argCheck(args, ["number"]);
        return 0;
    case "GetLinkPrimitiveParams":
        argCheck(args, ["number", "list"]);
        return getPrimParams(state.prim, args[0], args[1]);
    case "GetLinkSitFlags":
        argCheck(args, ["number"]);
        const et = state.prim.prim(args[0]);
        if(!(et instanceof SLuaPrimitive)) {
            throw `Link ${args[0]} is not a primitive`;
        }
        return et.sitFlags;
    case "GetListEntryType":
        argCheck(args, ["list", "number"]);
        return 0;
    case "GetListLength":
        argCheck(args, ["list"]);
        return args[0].length;
    case "GetLocalPos":
        argCheck(args);
        return state.prim.localPos;
    case "GetLocalRot":
        argCheck(args);
        return state.prim.localRot;
    case "GetMass":
        argCheck(args);
        return 0.0;
    case "GetMassMKS":
        argCheck(args);
        return 0.0;
    case "GetMaxScaleFactor":
        argCheck(args);
        return 0.0;
    case "GetMemoryLimit":
        argCheck(args);
        return 0;
    case "GetMinScaleFactor":
        argCheck(args);
        return 0.0;
    case "GetMoonDirection":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetMoonRotation":
        argCheck(args);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "GetNextEmail":
        argCheck(args, ["string", "string"]);
        return null;
    case "GetNotecardLine":
        argCheck(args, ["string", "number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetNotecardLineSync":
        argCheck(args, ["string", "number"]);
        return "";
    case "GetNumberOfNotecardLines":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetNumberOfPrims":
        argCheck(args);
        return 0;
    case "GetNumberOfSides":
        argCheck(args);
        return 0;
    case "GetObjectAnimationNames":
        argCheck(args);
        return [];
    case "GetObjectDesc":
        argCheck(args);
        return "";
    case "GetObjectDetails":
        argCheck(args, ["uuid", "list"]);
        return [];
    case "GetObjectLinkKey":
        argCheck(args, ["uuid", "number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetObjectMass":
        argCheck(args, ["uuid"]);
        return 0.0;
    case "GetObjectName":
        argCheck(args);
        return state.prim.name;
    case "GetObjectPermMask":
        argCheck(args, ["number"]);
        return 0;
    case "GetObjectPrimCount":
        argCheck(args, ["uuid"]);
        return 0;
    case "GetOmega":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetOwner":
        argCheck(args);
        return state.prim.owner;
    case "GetOwnerKey":
        argCheck(args, ["uuid"]);
        return new SLuaUUID();
    case "GetParcelDetails":
        argCheck(args, ["vector", "list"]);
        return [];
    case "GetParcelFlags":
        argCheck(args, ["vector"]);
        return 0;
    case "GetParcelMaxPrims":
        argCheck(args, ["vector", "number"]);
        return 0;
    case "GetParcelMusicURL":
        argCheck(args);
        return "";
    case "GetParcelPrimCount":
        argCheck(args, ["vector", "number", "number"]);
        return 0;
    case "GetParcelPrimOwners":
        argCheck(args, ["vector"]);
        return [];
    case "GetPermissions":
        argCheck(args);
        return 0;
    case "GetPermissionsKey":
        argCheck(args);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "GetPhysicsMaterial":
        argCheck(args);
        return [];
    case "GetPrimMediaParams":
        argCheck(args, ["number", "list"]);
        return [];
    case "GetPrimitiveParams":
        argCheck(args, ["list"]);
        return getPrimParams(state.prim, 1, args[0]);
    case "GetRegionAgentCount":
        argCheck(args);
        return 0;
    case "GetRegionCorner":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetRegionDayLength":
        argCheck(args);
        return 0;
    case "GetRegionDayOffset":
        argCheck(args);
        return 0;
    case "GetRegionFPS":
        argCheck(args);
        return 0.0;
    case "GetRegionFlags":
        argCheck(args);
        return 0;
    case "GetRegionMoonDirection":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetRegionMoonRotation":
        argCheck(args);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "GetRegionName":
        argCheck(args);
        return "";
    case "GetRegionSunDirection":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetRegionSunRotation":
        argCheck(args);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "GetRegionTimeDilation":
        argCheck(args);
        return 0.0;
    case "GetRegionTimeOfDay":
        argCheck(args);
        return 0.0;
    case "GetRenderMaterial":
        argCheck(args, ["number"]);
        return "";
    case "GetRootPosition":
        argCheck(args);
        return state.prim.rootPos;
    case "GetRootRotation":
        argCheck(args);
        return state.prim.rootRot;
    case "GetRot":
        argCheck(args);
        return state.prim.rot;
    case "GetSPMaxMemory":
        argCheck(args);
        return 0;
    case "GetScale":
        argCheck(args);
        return state.prim.size;
    case "GetScriptName":
        argCheck(args);
        return "New Script";
    case "GetScriptState":
        argCheck(args, ["string"]);
        return true;
    case "GetSimStats":
        argCheck(args, ["number"]);
        return 0.0;
    case "GetSimulatorHostname":
        argCheck(args);
        return "";
    case "GetStartParameter":
        argCheck(args);
        return 0;
    case "GetStartString":
        argCheck(args);
        return "";
    case "GetStaticPath":
        argCheck(args, ["vector", "vector", "number", "list"]);
        return [];
    case "GetStatus":
        argCheck(args, ["number"]);
        return 0;
    case "GetSubString":
        argCheck(args, ["string", "number", "number"]);
        return args[0].substring(args[1], args[2]); // TODO : negative
    case "GetSunDirection":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetSunRotation":
        argCheck(args);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "GetTexture":
        argCheck(args, ["number"]);
        return "";
    case "GetTextureOffset":
        argCheck(args, ["number"]);
        return state.prim.faces[args[0]].offset;
    case "GetTextureRot":
        argCheck(args, ["number"]);
        return state.prim.faces[args[0]].rotation;
    case "GetTextureScale":
        argCheck(args, ["number"]);
        return state.prim.faces[args[0]].repeats;
    case "GetTime":
        argCheck(args);
        return 0.0;
    case "GetTimeOfDay":
        argCheck(args);
        return 0.0;
    case "GetTimestamp":
        argCheck(args);
        return "";
    case "GetTorque":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetUnixTime":
        argCheck(args);
        return (Math.floor(Date.now() / 1000));
    case "GetUsedMemory":
        argCheck(args);
        return 0;
    case "GetUsername":
        argCheck(args, ["uuid"]);
        return "";
    case "GetVel":
        argCheck(args);
        return new SLuaVec(0, 0, 0);
    case "GetVisualParams":
        argCheck(args, ["uuid", "list"]);
        return [];
    case "GetWallclock":
        argCheck(args);
        return 0.0;
    case "GiveAgentInventory":
        argCheck(args, ["uuid", "string", "list", "list"]);
        return 0;
    case "GiveInventory":
        argCheck(args, ["uuid", "string"]);
        return null;
    case "GiveInventoryList":
        argCheck(args, ["uuid", "string", "list"]);
        return null;
    case "GiveMoney":
        argCheck(args, ["uuid", "number"]);
        return 0;
    case "GodLikeRezObject":
        argCheck(args, ["uuid", "vector"]);
        return null;
    case "Ground":
        argCheck(args, ["vector"]);
        return 0.0;
    case "GroundContour":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "GroundNormal":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "GroundRepel":
        argCheck(args, ["number", "number", "number"]);
        return null;
    case "GroundSlope":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "HMAC":
        argCheck(args, ["string", "string", "string"]);
        return "";
    case "HTTPRequest":
        argCheck(args, ["string", "list", "string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "HTTPResponse":
        argCheck(args, ["uuid", "number", "string"]);
        return null;
    case "Hash":
        argCheck(args, ["string"]);
        return 0;
    case "InsertString":
        argCheck(args, ["string", "number", "string"]);
        return "";
    case "InstantMessage":
        argCheck(args, ["uuid", "string"]);
        return null;
    case "IntegerToBase64":
        argCheck(args, ["number"]);
        return "";
    case "IsFriend":
        argCheck(args, ["uuid"]);
        return 0;
    case "IsLinkGLTFMaterial":
        argCheck(args, ["number", "number"]);
        return 0;
    case "Json2List":
        argCheck(args, ["string"]);
        return [];
    case "JsonGetValue":
        argCheck(args, ["string", "list"]);
        return "";
    case "JsonSetValue":
        argCheck(args, ["string", "list", "string"]);
        return "";
    case "JsonValueType":
        argCheck(args, ["string", "list"]);
        return "";
    case "Key2Name":
        argCheck(args, ["uuid"]);
        return "name";
    case "KeyCountKeyValue":
        argCheck(args);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "KeysKeyValue":
        argCheck(args, ["number", "number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "Linear2sRGB":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "LinkAdjustSoundVolume":
        argCheck(args, ["number", "number"]);
        return null;
    case "LinkParticleSystem":
        argCheck(args, ["number", "list"]);
        return null;
    case "LinkPlaySound":
        argCheck(args, ["number", "string", "number", "number"]);
        return null;
    case "LinkSetSoundQueueing":
        argCheck(args, ["number", "number"]);
        return null;
    case "LinkSetSoundRadius":
        argCheck(args, ["number", "number"]);
        return null;
    case "LinkSitTarget":
        argCheck(args, ["number", "vector", "quaternion"]);
        return null;
    case "LinkStopSound":
        argCheck(args, ["number"]);
        return null;
    case "LinksetDataAvailable":
        argCheck(args);
        return 0;
    case "LinksetDataCountFound":
        argCheck(args, ["string"]);
        return 0;
    case "LinksetDataCountKeys":
        argCheck(args);
        return 0;
    case "LinksetDataDelete":
        argCheck(args, ["string"]);
        state.prim.lsd(args[0], "");
        return 0;
    case "LinksetDataDeleteFound":
        argCheck(args, ["string", "string"]);
        return [0,0];
    case "LinksetDataDeleteProtected":
        argCheck(args, ["string", "string"]);
        state.prim.lsd(args[0], "");
        return 0;
    case "LinksetDataFindKeys":
        argCheck(args, ["string", "number", "number"]);
        return [];
    case "LinksetDataListKeys":
        argCheck(args, ["number", "number"]);
        return [];
    case "LinksetDataRead":
        argCheck(args, ["string"]);
        return state.prim.lsd(args[0]);
    case "LinksetDataReadProtected":
        argCheck(args, ["string", "string"]);
        return state.prim.lsd(args[0]);
    case "LinksetDataReset":
        argCheck(args);
        state.prim._lsd = {};
        return null;
    case "LinksetDataWrite":
        argCheck(args, ["string", "string"]);
        state.prim.lsd(args[0], args[1]);
        return 0;
    case "LinksetDataWriteProtected":
        argCheck(args, ["string", "string", "string"]);
        state.prim.lsd(args[0], args[1]);
        return 0;
    case "List2CSV":
        argCheck(args, ["list"]);
        return args[0].join(", ");
    case "List2Float":
        argCheck(args, ["list", "number"]);
        return parseFloat(args[0][args[1]]); // TODO : negative indexes
    case "List2Integer":
        argCheck(args, ["list", "number"]);
        return parseInt(args[0][args[1]]); // TODO : negative indexes
    case "List2Json":
        argCheck(args, ["string", "list"]);
        return "";
    case "List2Key":
        argCheck(args, ["list", "number"]);
        return new SLuaUUID(args[0][args[1]]); // TODO : negative indexes
    case "List2List":
        argCheck(args, ["list", "number", "number"]);
        return args[0].slice(args[1], args[2]); // TODO : negative indexes
    case "List2ListSlice":
        argCheck(args, ["list", "number", "number", "number", "number"]);
        return [];
    case "List2ListStrided":
        argCheck(args, ["list", "number", "number", "number"]);
        return [];
    case "List2Rot":
        argCheck(args, ["list", "number"]);
        return new SLuaQuaternion(0, 0, 0, 1); // TODO : cast strings
    case "List2String":
        argCheck(args, ["list", "number"]);
        return "";
    case "List2Vector":
        argCheck(args, ["list", "number"]);
        return SLuaVec.fromAny(args[0][args[1]]);
    case "ListFindList":
        argCheck(args, ["list", "list"]);
        return 0;
    case "ListFindListNext":
        argCheck(args, ["list", "list", "number"]);
        return 0;
    case "ListFindStrided":
        argCheck(args, ["list", "list", "number", "number", "number"]);
        return 0;
    case "ListInsertList":
        argCheck(args, ["list", "list", "number"]);
        return [];
    case "ListRandomize":
        argCheck(args, ["list", "number"]);
        return [];
    case "ListReplaceList":
        argCheck(args, ["list", "list", "number", "number"]);
        return [];
    case "ListSort":
        argCheck(args, ["list", "number", "number"]);
        return [];
    case "ListSortStrided":
        argCheck(args, ["list", "number", "number", "number"]);
        return [];
    case "ListStatistics":
        argCheck(args, ["number", "list"]);
        return 0.0;
    case "Listen":
        argCheck(args, ["number", "string", "uuid", "string"]);
        return 0;
    case "ListenControl":
        argCheck(args, ["number", "number"]);
        return null;
    case "ListenRemove":
        argCheck(args, ["number"]);
        return null;
    case "LoadURL":
        argCheck(args, ["uuid", "string", "string"]);
        return null;
    case "Log":
        argCheck(args, ["number"]);
        return Math.log(args[0]);
    case "Log10":
        argCheck(args, ["number"]);
        return Math.log10(args[0]);
    case "LookAt":
        argCheck(args, ["vector", "number", "number"]);
        return null;
    case "LoopSound":
        argCheck(args, ["string", "number"]);
        return null;
    case "LoopSoundMaster":
        argCheck(args, ["string", "number"]);
        return null;
    case "LoopSoundSlave":
        argCheck(args, ["string", "number"]);
        return null;
    case "MD5String":
        argCheck(args, ["string", "number"]);
        return "";
    case "MakeExplosion":
        argCheck(args, ["number", "number", "number", "number", "number", "string", "vector"]);
        return null;
    case "MakeFire":
        argCheck(args, ["number", "number", "number", "number", "number", "string", "vector"]);
        return null;
    case "MakeFountain":
        argCheck(args, ["number", "number", "number", "number", "number", "number", "string", "vector", "number"]);
        return null;
    case "MakeSmoke":
        argCheck(args, ["number", "number", "number", "number", "number", "string", "vector"]);
        return null;
    case "ManageEstateAccess":
        argCheck(args, ["number", "uuid"]);
        return 0;
    case "MapBeacon":
        argCheck(args, ["string", "vector", "list"]);
        return null;
    case "MapDestination":
        argCheck(args, ["string", "vector", "vector"]);
        return null;
    case "MessageLinked":
        argCheck(args, ["number", "number", "string", "uuid"]);
        return null;
    case "MinEventDelay":
        argCheck(args, ["number"]);
        return null;
    case "ModPow":
        argCheck(args, ["number", "number", "number"]);
        return 0;
    case "ModifyLand":
        argCheck(args, ["number", "number"]);
        return null;
    case "MoveToTarget":
        argCheck(args, ["vector", "number"]);
        return null;
    case "Name2Key":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "NavigateTo":
        argCheck(args, ["vector", "list"]);
        return null;
    case "OffsetTexture":
        argCheck(args, ["number", "number", "number"]);
        return null;
    case "OpenFloater":
        argCheck(args, ["string", "string", "list"]);
        return 0;
    case "OpenRemoteDataChannel":
        argCheck(args);
        return null;
    case "Ord":
        argCheck(args, ["string", "number"]);
        return 0;
    case "OverMyLand":
        argCheck(args, ["uuid"]);
        return 0;
    case "ParcelMediaCommandList":
        argCheck(args, ["list"]);
        return null;
    case "ParcelMediaQuery":
        argCheck(args, ["list"]);
        return [];
    case "ParseString2List":
        argCheck(args, ["string", "list", "list"]);
        return [];
    case "ParseStringKeepNulls":
        argCheck(args, ["string", "list", "list"]);
        return [];
    case "ParticleSystem":
        argCheck(args, ["list"]);
        return null;
    case "PassCollisions":
        argCheck(args, ["number"]);
        return null;
    case "PassTouches":
        argCheck(args, ["number"]);
        return null;
    case "PatrolPoints":
        argCheck(args, ["list", "list"]);
        return null;
    case "PlaySound":
        argCheck(args, ["string", "number"]);
        return null;
    case "PlaySoundSlave":
        argCheck(args, ["string", "number"]);
        return null;
    case "PointAt":
        argCheck(args, ["vector"]);
        return null;
    case "Pow":
        argCheck(args, ["number", "number"]);
        return 0.0;
    case "PreloadSound":
        argCheck(args, ["string"]);
        return null;
    case "Pursue":
        argCheck(args, ["uuid", "list"]);
        return null;
    case "PushObject":
        argCheck(args, ["uuid", "vector", "vector", "number"]);
        return null;
    case "ReadKeyValue":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RefreshPrimURL":
        argCheck(args);
        return null;
    case "RegionSayTo":
        argCheck(args, ["uuid", "number", "string"]);
        return null;
    case "ReleaseCamera":
        argCheck(args, ["uuid"]);
        return null;
    case "ReleaseControls":
        argCheck(args);
        return null;
    case "ReleaseURL":
        argCheck(args, ["string"]);
        return null;
    case "RemoteDataReply":
        argCheck(args, ["uuid", "uuid", "string", "number"]);
        return null;
    case "RemoteDataSetRegion":
        argCheck(args);
        return null;
    case "RemoteLoadScript":
        argCheck(args, ["uuid", "string", "number", "number"]);
        return null;
    case "RemoteLoadScriptPin":
        argCheck(args, ["uuid", "string", "number", "number", "number"]);
        return null;
    case "RemoveFromLandBanList":
        argCheck(args, ["uuid"]);
        return null;
    case "RemoveFromLandPassList":
        argCheck(args, ["uuid"]);
        return null;
    case "RemoveInventory":
        argCheck(args, ["string"]);
        return null;
    case "RemoveVehicleFlags":
        argCheck(args, ["number"]);
        return null;
    case "ReplaceAgentEnvironment":
        argCheck(args, ["uuid", "number", "string"]);
        return 0;
    case "ReplaceEnvironment":
        argCheck(args, ["vector", "string", "number", "number", "number"]);
        return 0;
    case "ReplaceSubString":
        argCheck(args, ["string", "string", "string", "number"]);
        return "";
    case "RequestAgentData":
        argCheck(args, ["uuid", "number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestDisplayName":
        argCheck(args, ["uuid"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestExperiencePermissions":
        argCheck(args, ["uuid", "string"]);
        return null;
    case "RequestInventoryData":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestPermissions":
        argCheck(args, ["uuid", "number"]);
        return null;
    case "RequestSecureURL":
        argCheck(args);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestSimulatorData":
        argCheck(args, ["string", "number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestURL":
        argCheck(args);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestUserKey":
        argCheck(args, ["string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "RequestUsername":
        argCheck(args, ["uuid"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "ResetAnimationOverride":
        argCheck(args, ["string"]);
        return null;
    case "ResetLandBanList":
        argCheck(args);
        return null;
    case "ResetLandPassList":
        argCheck(args);
        return null;
    case "ResetOtherScript":
        argCheck(args, ["string"]);
        return null;
    case "ResetScript":
        argCheck(args);
        return null;
    case "ResetTime":
        argCheck(args);
        return null;
    case "ReturnObjectsByID":
        argCheck(args, ["list"]);
        return 0;
    case "ReturnObjectsByOwner":
        argCheck(args, ["uuid", "number"]);
        return 0;
    case "RezAtRoot":
        argCheck(args, ["string", "vector", "vector", "quaternion", "number"]);
        return null;
    case "RezObject":
        argCheck(args, ["string", "vector", "vector", "quaternion", "number"]);
        return null;
    case "RezObjectWithParams":
        argCheck(args, ["string", "list"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "Rot2Angle":
        argCheck(args, ["quaternion"]);
        return 0.0;
    case "Rot2Axis":
        argCheck(args, ["quaternion"]);
        return new SLuaVec(0, 0, 0);
    case "Rot2Euler":
        argCheck(args, ["quaternion"]);
        return new SLuaVec(0, 0, 0);
    case "Rot2Fwd":
        argCheck(args, ["quaternion"]);
        return new SLuaVec(0, 0, 0);
    case "Rot2Left":
        argCheck(args, ["quaternion"]);
        return new SLuaVec(0, 0, 0);
    case "Rot2Up":
        argCheck(args, ["quaternion"]);
        return new SLuaVec(0, 0, 0);
    case "RotBetween":
        argCheck(args, ["vector", "vector"]);
        return new SLuaQuaternion(0, 0, 0, 1);
    case "RotLookAt":
        argCheck(args, ["quaternion", "number", "number"]);
        return null;
    case "RotTarget":
        argCheck(args, ["quaternion", "number"]);
        return 0;
    case "RotTargetRemove":
        argCheck(args, ["number"]);
        return null;
    case "RotateTexture":
        argCheck(args, ["number", "number"]);
        return null;
    case "Round":
        argCheck(args, ["number"]);
        return Math.round(args[0]);
    case "SHA1String":
        argCheck(args, ["string"]);
        return "";
    case "SHA256String":
        argCheck(args, ["string"]);
        return "";
    case "SameGroup":
        argCheck(args, ["uuid"]);
        return 0;
    case "ScaleByFactor":
        argCheck(args, ["number"]);
        return 0;
    case "ScaleTexture":
        argCheck(args, ["number", "number", "number"]);
        return null;
    case "ScriptDanger":
        argCheck(args, ["vector"]);
        return 0;
    case "ScriptProfiler":
        argCheck(args, ["number"]);
        return null;
    case "SendRemoteData":
        argCheck(args, ["uuid", "string", "number", "string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "Sensor":
        argCheck(args, ["string", "uuid", "number", "number", "number"]);
        return null;
    case "SensorRemove":
        argCheck(args);
        return null;
    case "SensorRepeat":
        argCheck(args, ["string", "uuid", "number", "number", "number", "number"]);
        return null;
    case "SetAgentEnvironment":
        argCheck(args, ["uuid", "number", "list"]);
        return 0;
    case "SetAgentRot":
        argCheck(args, ["quaternion", "number"]);
        return null;
    case "SetAlpha":
        argCheck(args, ["number", "number"]);
        return null;
    case "SetAngularVelocity":
        argCheck(args, ["vector", "number"]);
        return null;
    case "SetAnimationOverride":
        argCheck(args, ["string", "string"]);
        return null;
    case "SetBuoyancy":
        argCheck(args, ["number"]);
        return null;
    case "SetCameraAtOffset":
        argCheck(args, ["vector"]);
        return null;
    case "SetCameraEyeOffset":
        argCheck(args, ["vector"]);
        return null;
    case "SetCameraParams":
        argCheck(args, ["list"]);
        return null;
    case "SetClickAction":
        argCheck(args, ["number"]);
        return null;
    case "SetColor":
        argCheck(args, ["vector", "number"]);
        return null;
    case "SetContentType":
        argCheck(args, ["uuid", "number"]);
        return null;
    case "SetDamage":
        argCheck(args, ["number"]);
        return null;
    case "SetEnvironment":
        argCheck(args, ["vector", "list"]);
        return 0;
    case "SetExperienceKey":
        argCheck(args, ["uuid"]);
        return 0;
    case "SetForce":
        argCheck(args, ["vector", "number"]);
        return null;
    case "SetForceAndTorque":
        argCheck(args, ["vector", "vector", "number"]);
        return null;
    case "SetGroundTexture":
        argCheck(args, ["list"]);
        return 0;
    case "SetHoverHeight":
        argCheck(args, ["number", "number", "number"]);
        return null;
    case "SetInventoryPermMask":
        argCheck(args, ["string", "number", "number"]);
        return null;
    case "SetKeyframedMotion":
        argCheck(args, ["list", "list"]);
        return null;
    case "SetLinkAlpha":
        argCheck(args, ["number", "number", "number"]);
        return null;
    case "SetLinkCamera":
        argCheck(args, ["number", "vector", "vector"]);
        return null;
    case "SetLinkColor": {
        argCheck(args, ["number", "vector", "number"]);
        const et = state.prim.prim(args[0]);
        if(!(et instanceof SLuaPrimitive)) {
            throw `Link ${args[0]} is not a primitive`;
        }
        et.faces[args[2]].color = args[1];
        return null;
    }
    case "SetLinkGLTFOverrides":
        argCheck(args, ["number", "number", "list"]);
        return null;
    case "SetLinkMedia":
        argCheck(args, ["number", "number", "list"]);
        return 0;
    case "SetLinkPrimitiveParams":
        argCheck(args, ["number", "list"]);
        return null;
    case "SetLinkPrimitiveParamsFast":
        argCheck(args, ["number", "list"]);
        return null;
    case "SetLinkRenderMaterial":
        argCheck(args, ["number", "string", "number"]);
        return null;
    case "SetLinkSitFlags":
        argCheck(args, ["number", "number"]);
        return null;
    case "SetLinkTexture":
        argCheck(args, ["number", "string", "number"]);
        return null;
    case "SetLinkTextureAnim":
        argCheck(args, ["number", "number", "number", "number", "number", "number", "number", "number"]);
        return null;
    case "SetLocalRot":
        argCheck(args, ["quaternion"]);
        return null;
    case "SetMemoryLimit":
        argCheck(args, ["number"]);
        return 0;
    case "SetObjectDesc":
        argCheck(args, ["string"]);
        return null;
    case "SetObjectName":
        argCheck(args, ["string"]);
        return null;
    case "SetObjectPermMask":
        argCheck(args, ["number", "number"]);
        return null;
    case "SetParcelForSale":
        argCheck(args, ["number", "list"]);
        return 0;
    case "SetParcelMusicURL":
        argCheck(args, ["string"]);
        return null;
    case "SetPayPrice":
        argCheck(args, ["number", "list"]);
        return null;
    case "SetPhysicsMaterial":
        argCheck(args, ["number", "number", "number", "number", "number"]);
        return null;
    case "SetPrimMediaParams":
        argCheck(args, ["number", "list"]);
        return 0;
    case "SetPrimURL":
        argCheck(args, ["string"]);
        return null;
    case "SetPrimitiveParams":
        argCheck(args, ["list"]);
        return null;
    case "SetRegionPos":
        argCheck(args, ["vector"]);
        return 0;
    case "SetRemoteScriptAccessPin":
        argCheck(args, ["number"]);
        return null;
    case "SetRenderMaterial":
        argCheck(args, ["string", "number"]);
        return null;
    case "SetRot":
        argCheck(args, ["quaternion"]);
        return null;
    case "SetScale":
        argCheck(args, ["vector"]);
        return null;
    case "SetScriptState":
        argCheck(args, ["string", "number"]);
        return null;
    case "SetSitText":
        argCheck(args, ["string"]);
        return null;
    case "SetSoundQueueing":
        argCheck(args, ["number"]);
        return null;
    case "SetSoundRadius":
        argCheck(args, ["number"]);
        return null;
    case "SetStatus":
        argCheck(args, ["number", "number"]);
        return null;
    case "SetText":
        argCheck(args, ["string", "vector", "number"]);
        return null;
    case "SetTexture":
        argCheck(args, ["string", "number"]);
        return null;
    case "SetTextureAnim":
        argCheck(args, ["number", "number", "number", "number", "number", "number", "number"]);
        return null;
    case "SetTimerEvent":
        argCheck(args, ["number"]);
        return null;
    case "SetTorque":
        argCheck(args, ["vector", "number"]);
        return null;
    case "SetTouchText":
        argCheck(args, ["string"]);
        return null;
    case "SetVehicleFlags":
        argCheck(args, ["number"]);
        return null;
    case "SetVehicleFloatParam":
        argCheck(args, ["number", "number"]);
        return null;
    case "SetVehicleRotationParam":
        argCheck(args, ["number", "quaternion"]);
        return null;
    case "SetVehicleType":
        argCheck(args, ["number"]);
        return null;
    case "SetVehicleVectorParam":
        argCheck(args, ["number", "vector"]);
        return null;
    case "SetVelocity":
        argCheck(args, ["vector", "number"]);
        return null;
    case "SignRSA":
        argCheck(args, ["string", "string", "string"]);
        return "";
    case "SitOnLink":
        argCheck(args, ["uuid", "number"]);
        return 0;
    case "SitTarget":
        argCheck(args, ["vector", "quaternion"]);
        return null;
    case "Sleep":
        argCheck(args, ["number"]);
        return null;
    case "Sound":
        argCheck(args, ["string", "number", "number", "number"]);
        return null;
    case "SoundPreload":
        argCheck(args, ["string"]);
        return null;
    case "StartAnimation":
        argCheck(args, ["string"]);
        return null;
    case "StartObjectAnimation":
        argCheck(args, ["string"]);
        return null;
    case "StopAnimation":
        argCheck(args, ["string"]);
        return null;
    case "StopHover":
        argCheck(args);
        return null;
    case "StopLookAt":
        argCheck(args);
        return null;
    case "StopMoveToTarget":
        argCheck(args);
        return null;
    case "StopObjectAnimation":
        argCheck(args, ["string"]);
        return null;
    case "StopPointAt":
        argCheck(args);
        return null;
    case "StopSound":
        argCheck(args);
        return null;
    case "StringLength":
        argCheck(args, ["string"]);
        return args[0].length;
    case "StringToBase64":
        argCheck(args, ["string"]);
        return "";
    case "StringTrim":
        argCheck(args, ["string", "number"]);
        switch(args[1]) {
            case 1:
                return args[0].trimStart();
            case 2:
                return args[0].trimEnd();
            case 3:
                return args[0].trim();
        }
        throw `Invalid trim mode: ${args[1]}`;
    case "SubStringIndex":
        argCheck(args, ["string", "string"]);
        return 0;
    case "TakeCamera":
        argCheck(args, ["uuid"]);
        return null;
    case "TakeControls":
        argCheck(args, ["number", "number", "number"]);
        return null;
    case "Target":
        argCheck(args, ["vector", "number"]);
        return 0;
    case "TargetOmega":
        argCheck(args, ["vector", "number", "number"]);
        return null;
    case "TargetRemove":
        argCheck(args, ["number"]);
        return null;
    case "TargetedEmail":
        argCheck(args, ["number", "string", "string"]);
        return null;
    case "TeleportAgent":
        argCheck(args, ["uuid", "string", "vector", "vector"]);
        return null;
    case "TeleportAgentGlobalCoords":
        argCheck(args, ["uuid", "vector", "vector", "vector"]);
        return null;
    case "TeleportAgentHome":
        argCheck(args, ["uuid"]);
        return null;
    case "TextBox":
        argCheck(args, ["uuid", "string", "number"]);
        return null;
    case "ToLower":
        argCheck(args, ["string"]);
        return "";
    case "ToUpper":
        argCheck(args, ["string"]);
        return "";
    case "TransferLindenDollars":
        argCheck(args, ["uuid", "number"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "TransferOwnership":
        argCheck(args, ["uuid", "number", "list"]);
        return 0;
    case "TriggerSound":
        argCheck(args, ["string", "number"]);
        return null;
    case "TriggerSoundLimited":
        argCheck(args, ["string", "number", "vector", "vector"]);
        return null;
    case "UnSit":
        argCheck(args, ["uuid"]);
        return null;
    case "UnescapeURL":
        argCheck(args, ["string"]);
        return "";
    case "UpdateCharacter":
        argCheck(args, ["list"]);
        return null;
    case "UpdateKeyValue":
        argCheck(args, ["string", "string", "number", "string"]);
        return new SLuaUUID('00000000-0000-0000-0000-000000000000');
    case "VecDist":
        argCheck(args, ["vector", "vector"]);
        return 0.0;
    case "VecMag":
        argCheck(args, ["vector"]);
        return 0.0;
    case "VecNorm":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "VerifyRSA":
        argCheck(args, ["string", "string", "string", "string"]);
        return 0;
    case "VolumeDetect":
        argCheck(args, ["number"]);
        return null;
    case "WanderWithin":
        argCheck(args, ["vector", "vector", "list"]);
        return null;
    case "Water":
        argCheck(args, ["vector"]);
        return 0.0;
    case "Wind":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "WorldPosToHUD":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);
    case "XorBase64":
        argCheck(args, ["string", "string"]);
        return "";
    case "XorBase64Strings":
        argCheck(args, ["string", "string"]);
        return "";
    case "XorBase64StringsCorrect":
        argCheck(args, ["string", "string"]);
        return "";
    case "sRGB2Linear":
        argCheck(args, ["vector"]);
        return new SLuaVec(0, 0, 0);


    case "GetKey":
        argCheck(args);
        return state.prim.id;

    case "Cos":
        return Math.cos(argCheck(args, ["number"])[0]);
    case "Sin":
        return Math.sin(argCheck(args, ["number"])[0]);
    case "Tan":
        return Math.tan(argCheck(args, ["number"])[0]);
    case "Sqrt":
        return Math.sqrt(argCheck(args, ["number"])[0]);
    case "OwnerSay":
      return null;
    case "GetPos":
        return state.prim.pos;
    case "SetPos":
        console.log("SetPos", args, argCheck(args, ["vector"])[0]);
        state.prim.pos = argCheck(args, ["vector"])[0];
        return null;
    case "Say":
    case "Shout":
    case "Whisper":
    case "RegionSay":
        argCheck(args, ["number", "string"]);
        console.log(name, args[0], args[1]);
        return null;
    default:
      throw `Unknown ll.${name}`;
  }
}