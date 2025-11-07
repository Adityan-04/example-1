from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from flask_jwt_extended import create_access_token
from models.user import User
from app import db, limiter
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
@limiter.limit('5 per minute')
def register():
    data = request.get_json()
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(
        email=data['email'],
        password=data['password'],
        name=data['name']
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify(user.to_dict()), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    
    if user and user.check_password(data['password']):
        login_user(user)
        user.last_login = datetime.utcnow()
        user.update_last_active()
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        return jsonify({
            'user': user.to_dict(),
            'token': access_token
        })
    
    return jsonify({'error': 'Invalid email or password'}), 401

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/me')
@login_required
def get_current_user():
    return jsonify(current_user.to_dict())

@auth_bp.route('/update', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json()
    
    if 'name' in data:
        current_user.name = data['name']
    if 'preferences' in data:
        current_user.preferences.update(data['preferences'])
    
    db.session.commit()
    return jsonify(current_user.to_dict())