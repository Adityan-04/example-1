from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from models.user import User
from app import db, limiter
from datetime import datetime

teams_bp = Blueprint('teams', __name__)

@teams_bp.route('/teams', methods=['GET'])
@login_required
@limiter.limit('30 per minute')
def get_teams():
    """Get all teams for the current user."""
    try:
        teams = current_user.teams
        return jsonify([{
            'id': team.get('id'),
            'name': team.get('name'),
            'role': team.get('role'),
            'created_at': team.get('created_at')
        } for team in teams])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/teams', methods=['POST'])
@login_required
@limiter.limit('10 per minute')
def create_team():
    """Create a new team."""
    try:
        data = request.get_json()
        team_name = data.get('name')
        
        if not team_name:
            return jsonify({'error': 'Team name is required'}), 400
            
        # Check if user can create more teams based on subscription
        team_limit = current_user.subscription.get('team_limit', 1)
        if len(current_user.teams) >= team_limit:
            return jsonify({'error': 'Team limit reached for your subscription'}), 403
        
        # Create new team
        new_team = {
            'id': str(len(current_user.teams) + 1),  # Simple ID generation
            'name': team_name,
            'role': 'owner',
            'created_at': datetime.utcnow().isoformat(),
            'members': [{
                'user_id': current_user.id,
                'role': 'owner',
                'joined_at': datetime.utcnow().isoformat()
            }]
        }
        
        current_user.teams.append(new_team)
        db.session.commit()
        
        return jsonify(new_team), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/teams/<team_id>', methods=['PUT'])
@login_required
@limiter.limit('10 per minute')
def update_team(team_id):
    """Update team details."""
    try:
        data = request.get_json()
        team_name = data.get('name')
        
        # Find team
        team = next((t for t in current_user.teams if t['id'] == team_id), None)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
            
        # Check permissions
        if team['role'] not in ['owner', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update team
        team['name'] = team_name
        db.session.commit()
        
        return jsonify(team)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/teams/<team_id>/members', methods=['POST'])
@login_required
@limiter.limit('10 per minute')
def add_team_member(team_id):
    """Add a new member to the team."""
    try:
        data = request.get_json()
        email = data.get('email')
        role = data.get('role', 'member')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
            
        # Find team
        team = next((t for t in current_user.teams if t['id'] == team_id), None)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
            
        # Check permissions
        if team['role'] not in ['owner', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if user is already a member
        if any(m['user_id'] == user.id for m in team['members']):
            return jsonify({'error': 'User is already a team member'}), 400
        
        # Add member
        team['members'].append({
            'user_id': user.id,
            'role': role,
            'joined_at': datetime.utcnow().isoformat()
        })
        
        # Add team to user's teams
        user_team = team.copy()
        user_team['role'] = role
        user.teams.append(user_team)
        
        db.session.commit()
        
        return jsonify({'message': 'Member added successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/teams/<team_id>/members/<user_id>', methods=['DELETE'])
@login_required
@limiter.limit('10 per minute')
def remove_team_member(team_id, user_id):
    """Remove a member from the team."""
    try:
        # Find team
        team = next((t for t in current_user.teams if t['id'] == team_id), None)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
            
        # Check permissions
        if team['role'] not in ['owner', 'admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Remove member
        team['members'] = [m for m in team['members'] if m['user_id'] != int(user_id)]
        
        # Remove team from user's teams
        user = User.query.get(user_id)
        if user:
            user.teams = [t for t in user.teams if t['id'] != team_id]
        
        db.session.commit()
        
        return jsonify({'message': 'Member removed successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@teams_bp.route('/teams/<team_id>', methods=['DELETE'])
@login_required
@limiter.limit('10 per minute')
def delete_team(team_id):
    """Delete a team."""
    try:
        # Find team
        team = next((t for t in current_user.teams if t['id'] == team_id), None)
        if not team:
            return jsonify({'error': 'Team not found'}), 404
            
        # Check permissions
        if team['role'] != 'owner':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Remove team from all members
        for member in team['members']:
            user = User.query.get(member['user_id'])
            if user:
                user.teams = [t for t in user.teams if t['id'] != team_id]
        
        # Remove team from current user
        current_user.teams = [t for t in current_user.teams if t['id'] != team_id]
        
        db.session.commit()
        
        return jsonify({'message': 'Team deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500