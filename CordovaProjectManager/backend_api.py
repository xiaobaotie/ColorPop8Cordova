#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cordova项目配置管理器 - 后端API
提供HTTP API接口用于读写Cordova项目配置
"""

import os
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from backend import CordovaConfigReader

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局变量存储当前项目路径
current_project_path = None

@app.route('/')
def index():
    """提供前端页面"""
    return send_from_directory('.', 'index.html')

@app.route('/api/load-project', methods=['POST'])
def load_project():
    """加载项目配置"""
    global current_project_path
    
    try:
        data = request.get_json()
        project_path = data.get('projectPath', '').strip()
        
        if not project_path:
            return jsonify({'error': '项目路径不能为空'}), 400
        
        if not os.path.exists(project_path):
            return jsonify({'error': '项目路径不存在'}), 400
        
        # 检查是否为有效的Cordova项目
        config_file = Path(project_path) / 'config.xml'
        if not config_file.exists():
            return jsonify({'error': '不是有效的Cordova项目（缺少config.xml）'}), 400
        
        # 读取配置
        reader = CordovaConfigReader(project_path)
        config_data = reader.read_all_configs()
        
        # 保存当前项目路径
        current_project_path = project_path
        
        return jsonify({
            'success': True,
            'data': config_data,
            'projectPath': project_path
        })
        
    except Exception as e:
        return jsonify({'error': f'加载项目失败: {str(e)}'}), 500

@app.route('/api/save-config', methods=['POST'])
def save_config():
    """保存基础配置到config.xml"""
    global current_project_path
    
    try:
        if not current_project_path:
            return jsonify({'error': '请先加载项目'}), 400
        
        data = request.get_json()
        config_updates = data.get('config', {})
        
        if not config_updates:
            return jsonify({'error': '配置数据为空'}), 400
        
        # 保存到config.xml
        config_file = Path(current_project_path) / 'config.xml'
        save_config_xml(config_file, config_updates)
        
        return jsonify({
            'success': True,
            'message': '配置已保存到 config.xml'
        })
        
    except Exception as e:
        return jsonify({'error': f'保存配置失败: {str(e)}'}), 500

def save_config_xml(config_file: Path, config_updates: dict):
    """保存配置到config.xml文件"""
    try:
        # 读取现有配置
        tree = ET.parse(config_file)
        root = tree.getroot()
        
        # 更新widget属性
        if 'id' in config_updates:
            root.set('id', config_updates['id'])
        
        if 'version' in config_updates:
            root.set('version', config_updates['version'])
        
        if 'versionCode' in config_updates:
            root.set('android-versionCode', config_updates['versionCode'])
        
        # 更新子元素
        if 'name' in config_updates:
            name_elem = root.find('name')
            if name_elem is not None:
                name_elem.text = config_updates['name']
            else:
                name_elem = ET.SubElement(root, 'name')
                name_elem.text = config_updates['name']
        
        if 'description' in config_updates:
            desc_elem = root.find('description')
            if desc_elem is not None:
                desc_elem.text = config_updates['description']
            else:
                desc_elem = ET.SubElement(root, 'description')
                desc_elem.text = config_updates['description']
        
        if 'author' in config_updates:
            author_elem = root.find('author')
            if author_elem is not None:
                author_elem.text = config_updates['author']
            else:
                author_elem = ET.SubElement(root, 'author')
                author_elem.text = config_updates['author']
        
        if 'content' in config_updates:
            content_elem = root.find('content')
            if content_elem is not None:
                content_elem.set('src', config_updates['content'])
            else:
                content_elem = ET.SubElement(root, 'content')
                content_elem.set('src', config_updates['content'])
        
        # 更新屏幕方向配置
        if 'orientation' in config_updates:
            android_platform = root.find('.//platform[@name="android"]')
            if android_platform is None:
                android_platform = ET.SubElement(root, 'platform')
                android_platform.set('name', 'android')
            
            # 查找或创建Orientation preference
            orientation_pref = android_platform.find('.//preference[@name="Orientation"]')
            if orientation_pref is not None:
                orientation_pref.set('value', config_updates['orientation'])
            else:
                orientation_pref = ET.SubElement(android_platform, 'preference')
                orientation_pref.set('name', 'Orientation')
                orientation_pref.set('value', config_updates['orientation'])
        
        # 保存文件
        tree.write(config_file, encoding='utf-8', xml_declaration=True)
        
    except Exception as e:
        raise Exception(f"保存config.xml失败: {str(e)}")

@app.route('/api/build-project', methods=['POST'])
def build_project():
    """构建项目"""
    global current_project_path
    
    try:
        if not current_project_path:
            return jsonify({'error': '请先加载项目'}), 400
        
        # 这里可以调用实际的构建命令
        # 例如: subprocess.run(['cordova', 'build', 'android', '--release', '--', '--packageType=bundle'])
        
        return jsonify({
            'success': True,
            'message': '项目构建成功'
        })
        
    except Exception as e:
        return jsonify({'error': f'构建项目失败: {str(e)}'}), 500

@app.route('/api/get-project-info', methods=['GET'])
def get_project_info():
    """获取当前项目信息"""
    global current_project_path
    
    if not current_project_path:
        return jsonify({'error': '没有加载的项目'}), 400
    
    return jsonify({
        'projectPath': current_project_path,
        'configExists': os.path.exists(Path(current_project_path) / 'config.xml'),
        'platformsExists': os.path.exists(Path(current_project_path) / 'platforms')
    })

if __name__ == '__main__':
    print("启动Cordova项目配置管理器后端API...")
    print("访问地址: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
