#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cordova项目配置管理器 - 后端处理
负责读取Cordova项目的配置文件并解析配置信息
"""

import os
import json
import xml.etree.ElementTree as ET
import re
from pathlib import Path
from typing import Dict, Any, Optional

class CordovaConfigReader:
    """Cordova项目配置读取器"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.config_data = {}
    
    def read_all_configs(self) -> Dict[str, Any]:
        """读取所有配置文件"""
        try:
            # 读取基础配置
            self.config_data['basic'] = self.read_config_xml()
            
            # 读取Android配置
            self.config_data['android'] = self.read_android_manifest()
            
            # 读取构建配置
            self.config_data['build'] = self.read_build_gradle()
            
            # 读取权限配置
            self.config_data['permissions'] = self.read_permissions()
            
            # 读取签名配置
            self.config_data['signing'] = self.read_signing_config()
            
            # 读取图标配置
            self.config_data['icons'] = self.read_icons_config()
            
            # 读取16KB支持配置
            self.config_data['memory16KB'] = self.read_16kb_config()
            
            return self.config_data
            
        except Exception as e:
            raise Exception(f"读取配置失败: {str(e)}")
    
    def read_config_xml(self) -> Dict[str, Any]:
        """读取config.xml配置"""
        config_file = self.project_path / 'config.xml'
        
        if not config_file.exists():
            raise FileNotFoundError("config.xml文件不存在")
        
        try:
            tree = ET.parse(config_file)
            root = tree.getroot()
            
            # 解析widget属性
            widget_attrs = root.attrib
            
            # 解析子元素
            name = self.get_element_text(root, 'name', '')
            description = self.get_element_text(root, 'description', '')
            author = self.get_element_text(root, 'author', '')
            content = self.get_element_text(root, 'content', 'index.html')
            
            # 解析author属性
            author_elem = root.find('author')
            author_email = author_elem.get('email', '') if author_elem is not None else ''
            author_url = author_elem.get('href', '') if author_elem is not None else ''
            
            # 解析平台配置
            android_platform = root.find('.//platform[@name="android"]')
            orientation = 'portrait'
            if android_platform is not None:
                orientation_pref = android_platform.find('.//preference[@name="Orientation"]')
                if orientation_pref is not None:
                    orientation = orientation_pref.get('value', 'portrait')
            
            return {
                'id': widget_attrs.get('id', ''),
                'version': widget_attrs.get('version', ''),
                'versionCode': widget_attrs.get('android-versionCode', ''),
                'name': name,
                'description': description,
                'author': author,
                'authorEmail': author_email,
                'authorUrl': author_url,
                'content': content,
                'orientation': orientation
            }
            
        except ET.ParseError as e:
            raise Exception(f"解析config.xml失败: {str(e)}")
    
    def read_android_manifest(self) -> Dict[str, Any]:
        """读取AndroidManifest.xml配置"""
        manifest_file = self.project_path / 'platforms' / 'android' / 'app' / 'src' / 'main' / 'AndroidManifest.xml'
        
        if not manifest_file.exists():
            raise FileNotFoundError("AndroidManifest.xml文件不存在")
        
        try:
            tree = ET.parse(manifest_file)
            root = tree.getroot()
            
            manifest_attrs = root.attrib
            application = root.find('application')
            
            # 解析权限
            permissions = []
            for perm in root.findall('.//uses-permission'):
                perm_name = perm.get('{http://schemas.android.com/apk/res/android}name', '')
                if perm_name:
                    permissions.append(perm_name)
            
            return {
                'packageName': manifest_attrs.get('package', ''),
                'versionName': manifest_attrs.get('{http://schemas.android.com/apk/res/android}versionName', ''),
                'versionCode': manifest_attrs.get('{http://schemas.android.com/apk/res/android}versionCode', ''),
                'extractNativeLibs': application.get('{http://schemas.android.com/apk/res/android}extractNativeLibs', ''),
                'hardwareAccelerated': application.get('{http://schemas.android.com/apk/res/android}hardwareAccelerated', ''),
                'permissions': permissions
            }
            
        except ET.ParseError as e:
            raise Exception(f"解析AndroidManifest.xml失败: {str(e)}")
    
    def read_build_gradle(self) -> Dict[str, Any]:
        """读取build.gradle配置"""
        gradle_file = self.project_path / 'platforms' / 'android' / 'app' / 'build.gradle'
        
        if not gradle_file.exists():
            raise FileNotFoundError("build.gradle文件不存在")
        
        try:
            with open(gradle_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 解析版本代码
            version_code_match = re.search(r'versionCode\s+(\d+)', content)
            version_code = version_code_match.group(1) if version_code_match else ''
            
            # 解析应用ID
            app_id_match = re.search(r'applicationId\s+["\']([^"\']+)["\']', content)
            app_id = app_id_match.group(1) if app_id_match else ''
            
            # 解析SDK版本
            min_sdk_match = re.search(r'minSdkVersion\s+(\d+)', content)
            min_sdk = min_sdk_match.group(1) if min_sdk_match else ''
            
            target_sdk_match = re.search(r'targetSdkVersion\s+(\d+)', content)
            target_sdk = target_sdk_match.group(1) if target_sdk_match else ''
            
            compile_sdk_match = re.search(r'compileSdkVersion\s+(\d+)', content)
            compile_sdk = compile_sdk_match.group(1) if compile_sdk_match else ''
            
            return {
                'versionCode': version_code,
                'applicationId': app_id,
                'minSdkVersion': min_sdk,
                'targetSdkVersion': target_sdk,
                'compileSdkVersion': compile_sdk
            }
            
        except Exception as e:
            raise Exception(f"读取build.gradle失败: {str(e)}")
    
    def read_permissions(self) -> Dict[str, str]:
        """读取权限配置"""
        # 从AndroidManifest.xml读取权限
        manifest_file = self.project_path / 'platforms' / 'android' / 'app' / 'src' / 'main' / 'AndroidManifest.xml'
        
        if not manifest_file.exists():
            return {}
        
        try:
            tree = ET.parse(manifest_file)
            root = tree.getroot()
            
            permissions = {}
            for perm in root.findall('.//uses-permission'):
                perm_name = perm.get('{http://schemas.android.com/apk/res/android}name', '')
                if perm_name:
                    # 提取权限名称的最后部分
                    perm_key = perm_name.split('.')[-1].lower()
                    permissions[perm_key] = perm_name
            
            return permissions
            
        except Exception as e:
            return {}
    
    def read_signing_config(self) -> Dict[str, Any]:
        """读取签名配置"""
        # 检查keystore文件
        keystore_file = self.project_path / 'package.keystore'
        keystore_exists = keystore_file.exists()
        
        # 读取build.gradle中的签名配置
        gradle_file = self.project_path / 'platforms' / 'android' / 'app' / 'build.gradle'
        
        signing_config = {
            'keystoreFile': 'package.keystore',
            'keystoreExists': keystore_exists,
            'keyAlias': '',
            'storePassword': '***',
            'keyPassword': '***'
        }
        
        if gradle_file.exists():
            try:
                with open(gradle_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # 解析签名配置
                alias_match = re.search(r'keyAlias\s+["\']([^"\']+)["\']', content)
                if alias_match:
                    signing_config['keyAlias'] = alias_match.group(1)
                
            except Exception:
                pass
        
        return signing_config
    
    def read_icons_config(self) -> Dict[str, str]:
        """读取图标配置"""
        config_file = self.project_path / 'config.xml'
        
        if not config_file.exists():
            return {}
        
        try:
            tree = ET.parse(config_file)
            root = tree.getroot()
            
            icons = {}
            for icon in root.findall('.//icon'):
                src = icon.get('src', '')
                width = icon.get('width', '')
                height = icon.get('height', '')
                
                if src and width and height:
                    key = f"{width}x{height}"
                    icons[key] = src
            
            return icons
            
        except Exception:
            return {}
    
    def read_16kb_config(self) -> Dict[str, Any]:
        """读取16KB内存页面支持配置"""
        manifest_file = self.project_path / 'platforms' / 'android' / 'app' / 'src' / 'main' / 'AndroidManifest.xml'
        
        if not manifest_file.exists():
            return {'supportStatus': '未检测到'}
        
        try:
            tree = ET.parse(manifest_file)
            root = tree.getroot()
            
            application = root.find('application')
            if application is None:
                return {'supportStatus': '未检测到'}
            
            extract_native_libs = application.get('{http://schemas.android.com/apk/res/android}extractNativeLibs', '')
            
            if extract_native_libs == 'false':
                return {
                    'extractNativeLibs': 'false',
                    'supportStatus': '已启用'
                }
            else:
                return {
                    'extractNativeLibs': extract_native_libs or 'true',
                    'supportStatus': '未启用'
                }
                
        except Exception:
            return {'supportStatus': '检测失败'}
    
    def get_element_text(self, parent, tag: str, default: str = '') -> str:
        """获取元素的文本内容"""
        element = parent.find(tag)
        return element.text.strip() if element is not None and element.text else default

def main():
    """主函数 - 用于测试"""
    import sys
    
    if len(sys.argv) != 2:
        print("用法: python backend.py <项目路径>")
        sys.exit(1)
    
    project_path = sys.argv[1]
    
    try:
        reader = CordovaConfigReader(project_path)
        config_data = reader.read_all_configs()
        
        # 输出JSON格式的配置数据
        print(json.dumps(config_data, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"错误: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
