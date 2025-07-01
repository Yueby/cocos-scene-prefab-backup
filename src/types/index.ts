export interface AssetLibrary {
  [ext: string]: string;
}

export interface CocosAsset {
  name: string;
  displayName: string;
  source: string;
  path: string;
  url: string;
  file: string;
  uuid: string;
  importer: string;
  imported: boolean;
  invalid: boolean;
  type: string;
  isDirectory: boolean;
  instantiation?: any;
  readonly: boolean;
  library: AssetLibrary;
  subAssets: Record<string, any>;
  redirect?: any;
  visible: boolean;
  extends: string[];
}

export interface CocosSceneAsset extends CocosAsset {
  type: 'cc.SceneAsset';
}

export interface CocosPrefabAsset extends CocosAsset {
  type: 'cc.Prefab';
}
