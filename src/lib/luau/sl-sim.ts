export class SLuaUUID {
    value: string;
    constructor(uuid?: string) {
        if(uuid) {
            if(typeof uuid != "string") {
                uuid = "00000000-0000-0000-0000-000000000000";
            } else if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid)) {
                uuid = "00000000-0000-0000-0000-000000000000";
            }
        } else {
            uuid = crypto.randomUUID();
        }
        this.value = uuid;
    }
    toString(): string {
        return this.value;
    }
    toJSON(): string {
        return `!u${this.toString().slice(1,-1)}`;
    }
    static fromSLJson(json: string): SLuaUUID {
        return new SLuaUUID(json.substring(2));
    }
}

enum SLuaEntityType {
    Avatar = 1,
    Prim = 2,
}

export class SLuaEntity {
    id: SLuaUUID;
    root: SLuaPrimitive|null = null;
    type: SLuaEntityType;
    name: string = "";
    pos: SLuaVec = new SLuaVec(0, 0, 0);
    rot: SLuaQuaternion = new SLuaQuaternion(0, 0, 0, 1);
    desc: string = "";
    constructor(id: string|undefined, type: SLuaEntityType) {
        this.id = new SLuaUUID(id ?? crypto.randomUUID());
        this.type = type;
    }
    get localPos(): SLuaVec {
        if(this.root) {
            return this.pos.sub(this.root.pos);
        }
        return this.pos;
    }
    get localRot(): SLuaQuaternion {
        if(this.root) {
            throw "Not implmented";
        }
        return this.rot;
    }
    get rootPos(): SLuaVec {
        if(this.root) {
            return this.root.pos;
        }
        return this.pos;
    }
    get rootRot(): SLuaQuaternion {
        if(this.root) {
            return this.root.rot;
        }
        return this.rot;
    }
}

export class SLuaFace {
    alpha: number = 1;
    alphaMode: number = 0; // 0 = Opaque, 1 = Mask, 2 = Blend
    color: SLuaVec = new SLuaVec();
    texture: SLuaUUID = new SLuaUUID();
    offset: SLuaVec = new SLuaVec();
    rotation: number = 0;
    repeats: SLuaVec = new SLuaVec(1, 1, 0);
    mode: number = 0; // 0 = Default, 1 = Planar
    constructor() {
    }
}

export class SLuaAvatar extends SLuaEntity {
    get owner(): SLuaUUID {
        return this.id;
    }
    constructor(id: string|undefined) {
        super(id, SLuaEntityType.Avatar);
    }
}

export class SLuaPrimitive extends SLuaEntity {
    prims: SLuaEntity[] = [];

    _lsd: {[k:string]: string} = {};

    owner: SLuaUUID = new SLuaUUID();

    creator: SLuaUUID = new SLuaUUID();
    group: SLuaUUID = new SLuaUUID();
    size: SLuaVec = new SLuaVec(1, 1, 1);
    faces: SLuaFace[] = [];
    physicsShapeType: number = 0; // 0 = Prim, 1 = None, 2 = Convex
    material: number = 0; // 0 = Stone, 1 = Metal, 2 = Glass, 3 = Wood, 4 = Flesh, 5 = Plastic, 6 = Rubber
    _physics: boolean = false;
    _temp: boolean = false;
    _phantom: boolean = false;
    text: string = "";
    textColor: SLuaVec = new SLuaVec(1, 1, 1);
    textAlpha: number = 1;
    clickAction: number = 0;
    sitFlags: number = 0;
    damage: number = 0;
    damageType: number = 0;
    health: number = 0;

    type: number = 0;
    holeShape:number = 0;
    holeSize:SLuaVec = new SLuaVec(0, 0, 0);
    cut:SLuaVec = new SLuaVec(0, 0, 0);
    hollow:number = 0;
    twist:SLuaVec = new SLuaVec(0, 0, 0);
    topSize:SLuaVec = new SLuaVec(0, 0, 0);
    topShear:SLuaVec = new SLuaVec(0, 0, 0);
    dimple: SLuaVec = new SLuaVec(0, 0, 0);
    advancedCut:SLuaVec = new SLuaVec(0, 0, 0);
    taper:SLuaVec = new SLuaVec(0, 0, 0);
    revolutions:number = 0;
    radiusOffset: number = 0;
    skew: number = 0;
    slice:SLuaVec = new SLuaVec(0, 0, 0);

    flexibe = {
        enabled: false,
        softness: 0,
        gravity: 0,
        friction: 0,
        wind: 0,
        tension: 0,
        force: new SLuaVec(0, 0, 0),
    };

    sitPos:SLuaVec = new SLuaVec(0, 0, 0);
    sitRot:SLuaQuaternion = new SLuaQuaternion(0, 0, 0, 1);

    sculptMap: SLuaUUID = new SLuaUUID();
    sculptType: number = 1;

    get physics(): boolean {
        if(this.root) {
            return this.root.physics;
        }
        return this._physics;
    }
    get temp(): boolean {
        if(this.root) {
            return this.root.temp;
        }
        return this._temp;
    }
    get phantom(): boolean {
        if(this.root) {
            return this.root.phantom;
        }
        return this._phantom;
    }

    get typeData() : any[]{
        switch(this.type) {
            case 0:
            case 1:
            case 2:
                return [this.type, this.holeShape, this.cut, this.hollow, this.twist, this.topSize, this.topShear];
            case 3:
                return [this.type, this.holeShape, this.cut, this.hollow, this.twist, this.dimple];
            case 4:
            case 5:
            case 6:
                return [this.type, this.holeShape, this.cut, this.hollow, this.twist, this.holeSize, this.topShear, this.advancedCut, this.taper, this.revolutions, this.radiusOffset, this.skew];
            case 7:
                return [this.type, this.sculptMap, this.sculptType];
            default:
                throw `Unknown PRIM_TYPE : ${this.type}`;
        }
    }

    lsd(key:string, value?:string) : string{
        if(this.root) {
            return this.root.lsd(key, value);
        }
        if(typeof value === "string") {
            if(value === "") {
                delete this._lsd[key];
            } else {
                this._lsd[key] = value;            
            }
        }
        return this._lsd[key] ?? "";
    }

    constructor(id?: string) {
        super(id, SLuaEntityType.Prim);
        this.root = this;
        for(let i = 0; i < 8; i++) {
            this.faces.push(new SLuaFace());
        }
        this.prims.push(this);
    }

    prim(link: number): SLuaEntity|null {
        link--;
        if(link < 0) {
            if(link != -1) {
                throw `Link ${link} is not a primitive`;
            }
            throw `Expected 1 based index`;
        }
        if(this.prims.length < 2) {
            if(link != 0) {
                throw `Linkset only has 1 primitive`;
            }
            return this;
        }
        return this.prims[link] ?? null;
    }

    addPrim(prim: SLuaEntity) {
        this.prims.push(prim);
        prim.root = this;
        if(prim instanceof SLuaPrimitive) {
            this.prims.push(...prim.prims)
            prim.prims = [prim];
        }
    }
}

export class SLuaVec {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    toString(): string {
        return `<${this.x},${this.y},${this.z}>`;
    }
    toJSON(): string {
        return `!v${this.toString().slice(1,-1)}`;
    }
    sub(pos: SLuaVec): SLuaVec {
        return new SLuaVec(this.x - pos.x, this.y - pos.y, this.z - pos.z);
    }
    add(pos: SLuaVec): SLuaVec {
        return new SLuaVec(this.x + pos.x, this.y + pos.y, this.z + pos.z);
    }
    static fromSLJson(json: string): SLuaVec {
        const parts = json.substring(2).split(',');
        return new SLuaVec(Number(parts[0] ?? 0), Number(parts[1] ?? 0), Number(parts[2] ?? 0));
    }
    static fromString(str: string): SLuaVec {
        const parts = str.trim().substring(1).split(',');
        return new SLuaVec(Number(parts[0].trim()), Number(parts[1].trim()), Number(parts[2].trim()));
    }

    static fromAny(any: any): SLuaVec {
        if(any instanceof SLuaVec) {
            return any;
        }
        if(typeof any === "string") {
            return SLuaVec.fromString(any);
        }
        return new SLuaVec(0,0,0);
    }
}

export class SLuaQuaternion {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    w: number = 0;
    constructor(x: number, y: number, z: number, w: number) {
        this.x = x;
    }
    toString(): string {
        return `<${this.x},${this.y},${this.z},${this.w}>`;
    }
    toJSON(): string {
        return `!q${this.toString().slice(1,-1)}`;
    }
    static fromSLJson(json: string): SLuaQuaternion {
        const parts = json.substring(2).split(',');
        return new SLuaQuaternion(Number(parts[0] ?? 0), Number(parts[1] ?? 0), Number(parts[2] ?? 0), Number(parts[3] ?? 1));
    }
}


export const PRIM = {
    ALLOW_UNSIT : 39 ,
    ALPHA_MODE : 38 ,
    BUMP_SHINY : 19 ,
    CAST_SHADOWS : 24 ,
    CLICK_ACTION : 43 ,
    COLLISION_SOUND : 53 ,
    COLOR : 18 ,
    DAMAGE : 51 ,
    DESC : 28 ,
    FLEXIBLE : 21 ,
    FULLBRIGHT : 20 ,
    GLOW : 25 ,
    GLTF_BASE_COLOR : 48 ,
    GLTF_EMISSIVE : 46 ,
    GLTF_METALLIC_ROUGHNESS : 47 ,
    GLTF_NORMAL : 45 ,
    HEALTH : 52 ,
    LINK_TARGET : 34 ,
    MATERIAL : 2 ,
    NAME : 27 ,
    NORMAL : 37 ,
    OMEGA : 32 ,
    PHANTOM : 5 ,
    PHYSICS : 3 ,
    PHYSICS_SHAPE_TYPE : 30 ,
    POINT_LIGHT : 23 ,
    POS_LOCAL : 33 ,
    POSITION : 6 ,
    PROJECTOR : 42 ,
    REFLECTION_PROBE : 44 ,
    RENDER_MATERIAL : 49 ,
    ROT_LOCAL : 29 ,
    ROTATION : 8 ,
    SCRIPTED_SIT_ONLY : 40 ,
    SIT_FLAGS : 50 ,
    SIT_TARGET : 41 ,
    SIZE : 7 ,
    SLICE : 35 ,
    SPECULAR : 36 ,
    TEMP_ON_REZ : 4 ,
    TEXGEN : 22 ,
    TEXT : 26 ,
    TEXTURE : 17 ,
    TYPE : 9 ,
};