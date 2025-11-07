import streamlit as st
import os
import pandas as pd
import numpy as np
from datetime import datetime
import json
import bcrypt
import uuid
from PIL import Image
import io
import time
import sqlite3
from pathlib import Path

# Initialize session state variables if they don't exist
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'user_id' not in st.session_state:
    st.session_state.user_id = None
if 'user_name' not in st.session_state:
    st.session_state.user_name = None
if 'user_email' not in st.session_state:
    st.session_state.user_email = None
if 'user_role' not in st.session_state:
    st.session_state.user_role = None
if 'current_page' not in st.session_state:
    st.session_state.current_page = 'login'

# Create necessary directories
os.makedirs('uploads', exist_ok=True)
os.makedirs('database', exist_ok=True)

# Database setup
def init_db():
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    
    # Create users table
    c.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP,
        subscription_plan TEXT DEFAULT 'free',
        subscription_status TEXT DEFAULT 'active',
        usage TEXT DEFAULT '{}'
    )
    ''')
    
    # Create documents table
    c.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create teams table
    c.execute('''
    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users (id)
    )
    ''')
    
    # Create team_members table
    c.execute('''
    CREATE TABLE IF NOT EXISTS team_members (
        team_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Create monitors table
    c.execute('''
    CREATE TABLE IF NOT EXISTS monitors (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        document_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        conditions TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_checked TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (document_id) REFERENCES documents (id)
    )
    ''')
    
    # Create alerts table
    c.execute('''
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY,
        monitor_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read BOOLEAN DEFAULT 0,
        FOREIGN KEY (monitor_id) REFERENCES monitors (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# User authentication functions
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed_password):
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def register_user(email, password, name):
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    
    try:
        hashed_password = hash_password(password)
        c.execute(
            "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
            (email, hashed_password, name)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def authenticate_user(email, password):
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    
    c.execute("SELECT id, email, password, name, role FROM users WHERE email = ?", (email,))
    user = c.fetchone()
    conn.close()
    
    if user and check_password(password, user[2]):
        return {
            'id': user[0],
            'email': user[1],
            'name': user[3],
            'role': user[4]
        }
    return None

def update_last_active(user_id):
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    c.execute("UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

# Document management functions
def save_uploaded_file(uploaded_file, user_id):
    file_path = os.path.join('uploads', f"{user_id}_{uploaded_file.name}")
    with open(file_path, "wb") as f:
        f.write(uploaded_file.getbuffer())
    
    file_size = os.path.getsize(file_path)
    file_type = uploaded_file.type
    
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    c.execute(
        "INSERT INTO documents (user_id, filename, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)",
        (user_id, uploaded_file.name, file_path, file_type, file_size)
    )
    conn.commit()
    doc_id = c.lastrowid
    conn.close()
    
    return {
        'id': doc_id,
        'filename': uploaded_file.name,
        'file_path': file_path,
        'file_type': file_type,
        'file_size': file_size
    }

def get_user_documents(user_id):
    conn = sqlite3.connect('database/dee.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("""
        SELECT id, filename, file_type, file_size, status, created_at, metadata
        FROM documents
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    
    documents = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return documents

def get_document_by_id(doc_id, user_id):
    conn = sqlite3.connect('database/dee.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("""
        SELECT id, filename, file_path, file_type, file_size, status, created_at, metadata
        FROM documents
        WHERE id = ? AND user_id = ?
    """, (doc_id, user_id))
    
    document = c.fetchone()
    conn.close()
    
    if document:
        return dict(document)
    return None

def delete_document(doc_id, user_id):
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    
    # Get file path
    c.execute("SELECT file_path FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
    result = c.fetchone()
    
    if result:
        file_path = result[0]
        
        # Delete from database
        c.execute("DELETE FROM documents WHERE id = ? AND user_id = ?", (doc_id, user_id))
        conn.commit()
        
        # Delete file from disk
        if os.path.exists(file_path):
            os.remove(file_path)
        
        conn.close()
        return True
    
    conn.close()
    return False

# Simple search function
def search_documents(query, user_id):
    conn = sqlite3.connect('database/dee.db')
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    search_term = f"%{query}%"
    c.execute("""
        SELECT id, filename, file_type, file_size, status, created_at, metadata
        FROM documents
        WHERE user_id = ? AND (filename LIKE ? OR metadata LIKE ?)
        ORDER BY created_at DESC
    """, (user_id, search_term, search_term))
    
    documents = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return documents

# Analytics functions
def get_user_stats(user_id):
    conn = sqlite3.connect('database/dee.db')
    c = conn.cursor()
    
    # Get document count
    c.execute("SELECT COUNT(*) FROM documents WHERE user_id = ?", (user_id,))
    doc_count = c.fetchone()[0]
    
    # Get total storage used
    c.execute("SELECT SUM(file_size) FROM documents WHERE user_id = ?", (user_id,))
    storage_used = c.fetchone()[0] or 0
    
    # Get document types distribution
    c.execute("""
        SELECT file_type, COUNT(*) as count
        FROM documents
        WHERE user_id = ?
        GROUP BY file_type
    """, (user_id,))
    doc_types = {row[0]: row[1] for row in c.fetchall()}
    
    conn.close()
    
    return {
        'document_count': doc_count,
        'storage_used': storage_used,
        'document_types': doc_types
    }

# Navigation functions
def navigate_to(page):
    st.session_state.current_page = page

# UI Components
def render_login_form():
    st.title("Login to Dee")
    
    with st.form("login_form"):
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        submit = st.form_submit_button("Login")
        
        if submit:
            user = authenticate_user(email, password)
            if user:
                st.session_state.authenticated = True
                st.session_state.user_id = user['id']
                st.session_state.user_name = user['name']
                st.session_state.user_email = user['email']
                st.session_state.user_role = user['role']
                update_last_active(user['id'])
                navigate_to('dashboard')
                st.rerun()
            else:
                st.error("Invalid email or password")
    
    st.write("Don't have an account?")
    if st.button("Register"):
        st.session_state.current_page = 'register'
        st.rerun()

def render_register_form():
    st.title("Create an Account")
    
    with st.form("register_form"):
        name = st.text_input("Name")
        email = st.text_input("Email")
        password = st.text_input("Password", type="password")
        confirm_password = st.text_input("Confirm Password", type="password")
        submit = st.form_submit_button("Register")
        
        if submit:
            if password != confirm_password:
                st.error("Passwords do not match")
            elif len(password) < 6:
                st.error("Password must be at least 6 characters long")
            else:
                success = register_user(email, password, name)
                if success:
                    st.success("Registration successful!")
                    # Redirect to login page
                    st.session_state.current_page = 'login'
                    st.rerun()
                else:
                    st.error("Email already registered")
    
    st.write("Already have an account?")
    if st.button("Login"):
        st.session_state.current_page = 'login'
        st.rerun()

def render_login_page():
    st.title("Dee - Document Analysis Platform")
    
    # Check which page to display
    if 'current_page' not in st.session_state or st.session_state.current_page == 'login':
        render_login_form()
    elif st.session_state.current_page == 'register':
        render_register_form()

def render_sidebar():
    with st.sidebar:
        st.title("Dee")
        
        st.write(f"Welcome, {st.session_state.user_name}")
        
        st.button("Dashboard", on_click=navigate_to, args=('dashboard',))
        st.button("Documents", on_click=navigate_to, args=('documents',))
        st.button("Search", on_click=navigate_to, args=('search',))
        st.button("Analytics", on_click=navigate_to, args=('analytics',))
        st.button("Teams", on_click=navigate_to, args=('teams',))
        st.button("Monitors", on_click=navigate_to, args=('monitors',))
        
        if st.button("Logout"):
            for key in st.session_state.keys():
                del st.session_state[key]
            st.rerun()

def render_dashboard():
    st.title("Dashboard")
    
    # Get user stats
    stats = get_user_stats(st.session_state.user_id)
    
    # Display stats in columns
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Documents", stats['document_count'])
    with col2:
        st.metric("Storage Used", f"{stats['storage_used'] / (1024*1024):.2f} MB")
    with col3:
        st.metric("Document Types", len(stats['document_types']))
    
    # Recent documents
    st.subheader("Recent Documents")
    documents = get_user_documents(st.session_state.user_id)
    
    if documents:
        for doc in documents[:5]:  # Show only 5 most recent
            with st.expander(f"{doc['filename']} ({doc['file_type']})"):
                st.write(f"Size: {doc['file_size'] / 1024:.2f} KB")
                st.write(f"Status: {doc['status']}")
                st.write(f"Created: {doc['created_at']}")
                
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("View", key=f"view_{doc['id']}"):
                        st.session_state.selected_document = doc['id']
                        navigate_to('document_view')
                        st.rerun()
                with col2:
                    if st.button("Delete", key=f"delete_{doc['id']}"):
                        if delete_document(doc['id'], st.session_state.user_id):
                            st.success("Document deleted")
                            st.rerun()
    else:
        st.info("No documents found. Upload your first document in the Documents section.")
    
    # Quick upload
    st.subheader("Quick Upload")
    uploaded_file = st.file_uploader("Choose a file", key="dashboard_uploader")
    if uploaded_file is not None:
        doc = save_uploaded_file(uploaded_file, st.session_state.user_id)
        st.success(f"File uploaded: {doc['filename']}")
        st.rerun()

def render_documents_page():
    st.title("Documents")
    
    # Upload section
    st.subheader("Upload Document")
    
    # Create two columns for upload and document list
    col1, col2 = st.columns([1, 2])
    
    with col1:
        # Simple file uploader without form
        uploaded_file = st.file_uploader("Choose a file", type=["pdf", "docx", "txt", "csv", "xlsx"], key="doc_uploader")
        
        # Only show these fields if a file is selected
        if uploaded_file is not None:
            doc_name = st.text_input("Document Name", value=uploaded_file.name)
            doc_description = st.text_area("Description (optional)")
            
            # Use a regular button instead of form submit
            if st.button("Upload Document", key="upload_btn"):
                # Process the file immediately
                try:
                    # Save the file
                    file_path = os.path.join("uploads", f"{get_next_doc_id()}_{uploaded_file.name}")
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    
                    with open(file_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())
                    
                    # Extract text content
                    text_content = extract_text_from_file(file_path)
                    
                    # Save to database
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    
                    cursor.execute('''
                        INSERT INTO documents (user_id, name, filename, file_path, description, content, file_size)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        st.session_state.user_id,
                        doc_name,
                        uploaded_file.name,
                        file_path,
                        doc_description,
                        text_content,
                        os.path.getsize(file_path)
                    ))
                    
                    conn.commit()
                    conn.close()
                    
                    st.success(f"Document '{doc_name}' uploaded successfully!")
                    
                    # Clear the uploader by forcing a rerun
                    st.session_state.doc_uploader = None
                    st.rerun()
                    
                except Exception as e:
                    st.error(f"Error uploading document: {str(e)}")
    
    # Documents list
    with col2:
        st.subheader("Your Documents")
        documents = get_user_documents(st.session_state.user_id)
        
        if documents:
            # Create a dataframe for better display
            df = pd.DataFrame(documents)
            df['size_mb'] = df['file_size'] / (1024*1024)
            df['size_mb'] = df['size_mb'].round(2)
            df['created_at'] = pd.to_datetime(df['created_at'])
            
            # Display as a table
            st.dataframe(
                df[['id', 'name', 'filename', 'size_mb', 'created_at']].rename(
                    columns={
                        'id': 'ID',
                        'name': 'Name',
                        'filename': 'Filename',
                        'size_mb': 'Size (MB)',
                        'created_at': 'Uploaded'
                    }
                ),
                hide_index=True
            )
            
            # Document actions
            doc_id = st.selectbox("Select a document", df['id'].tolist(), format_func=lambda x: df[df['id'] == x]['name'].iloc[0])
            
            col1, col2, col3 = st.columns(3)
            with col1:
                if st.button("View Document"):
                    st.query_params["doc_id"] = doc_id
                    navigate_to('document_view')
                    st.rerun()
            with col2:
                if st.button("Delete Document"):
                    delete_document(doc_id)
                    st.success("Document deleted successfully!")
                    st.rerun()
            with col3:
                if st.button("Search in Document"):
                    st.session_state.search_doc_id = doc_id
                    navigate_to('search')
                    st.rerun()
        else:
            st.info("You haven't uploaded any documents yet.")
    
    # Documents list
    st.subheader("Your Documents")
    documents = get_user_documents(st.session_state.user_id)
    
    if documents:
        # Create a dataframe for better display
        df = pd.DataFrame(documents)
        df['size_mb'] = df['file_size'] / (1024*1024)
        df['size_mb'] = df['size_mb'].round(2)
        df['created_at'] = pd.to_datetime(df['created_at'])
        
        # Display as a table
        st.dataframe(
            df[['id', 'filename', 'file_type', 'size_mb', 'status', 'created_at']],
            column_config={
                'id': 'ID',
                'filename': 'Filename',
                'file_type': 'Type',
                'size_mb': 'Size (MB)',
                'status': 'Status',
                'created_at': 'Created'
            },
            hide_index=True
        )
        
        # Document actions
        st.subheader("Document Actions")
        col1, col2 = st.columns(2)
        
        with col1:
            doc_id = st.selectbox("Select Document", options=[doc['id'] for doc in documents], 
                                 format_func=lambda x: next((doc['filename'] for doc in documents if doc['id'] == x), ''))
        
        with col2:
            action = st.selectbox("Action", options=["View", "Delete", "Analyze"])
        
        if st.button("Execute Action"):
            if action == "View":
                st.session_state.selected_document = doc_id
                navigate_to('document_view')
                st.rerun()
            elif action == "Delete":
                if delete_document(doc_id, st.session_state.user_id):
                    st.success("Document deleted")
                    st.rerun()
            elif action == "Analyze":
                st.info("Analysis functionality will be implemented in a future update")
    else:
        st.info("No documents found. Upload your first document using the uploader above.")

def render_search_page():
    st.title("Search Documents")
    
    query = st.text_input("Search Query")
    
    if query:
        results = search_documents(query, st.session_state.user_id)
        
        if results:
            st.success(f"Found {len(results)} documents")
            
            for doc in results:
                with st.expander(f"{doc['filename']} ({doc['file_type']})"):
                    st.write(f"Size: {doc['file_size'] / 1024:.2f} KB")
                    st.write(f"Status: {doc['status']}")
                    st.write(f"Created: {doc['created_at']}")
                    
                    if st.button("View", key=f"search_view_{doc['id']}"):
                        st.session_state.selected_document = doc['id']
                        navigate_to('document_view')
                        st.rerun()
        else:
            st.info("No documents found matching your query")

def render_document_view():
    if 'selected_document' not in st.session_state:
        st.error("No document selected")
        st.button("Back to Documents", on_click=navigate_to, args=('documents',))
        return
    
    doc = get_document_by_id(st.session_state.selected_document, st.session_state.user_id)
    
    if not doc:
        st.error("Document not found")
        st.button("Back to Documents", on_click=navigate_to, args=('documents',))
        return
    
    st.title(f"Document: {doc['filename']}")
    
    # Document info
    st.subheader("Document Information")
    col1, col2 = st.columns(2)
    with col1:
        st.write(f"Type: {doc['file_type']}")
        st.write(f"Size: {doc['file_size'] / 1024:.2f} KB")
    with col2:
        st.write(f"Status: {doc['status']}")
        st.write(f"Created: {doc['created_at']}")
    
    # Document preview
    st.subheader("Preview")
    file_path = doc['file_path']
    
    if doc['file_type'].startswith('image/'):
        st.image(file_path)
    elif doc['file_type'] == 'application/pdf' or file_path.lower().endswith('.pdf'):
        try:
            # Create a more reliable PDF display with fallback options
            with open(file_path, "rb") as f:
                pdf_bytes = f.read()
                
            # Primary method: PDF display using HTML object tag
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            pdf_display = f'''
                <div style="display: flex; justify-content: center;">
                    <object data="data:application/pdf;base64,{pdf_base64}" type="application/pdf" width="100%" height="600px">
                        <p>It appears your browser doesn't support embedded PDFs. 
                        You can <a href="data:application/pdf;base64,{pdf_base64}" download="{doc['filename']}">download the PDF</a> instead.</p>
                    </object>
                </div>
            '''
            st.markdown(pdf_display, unsafe_allow_html=True)
            
            # Backup download option
            st.download_button(
                "⬇️ Download PDF",
                data=pdf_bytes,
                file_name=doc['filename'],
                mime="application/pdf"
            )
        except Exception as e:
            st.error(f"Error displaying PDF: {e}")
            # Still offer download as fallback
            try:
                with open(file_path, "rb") as f:
                    st.download_button(
                        "⬇️ Download PDF (Preview unavailable)",
                        data=f.read(),
                        file_name=doc['filename'],
                        mime="application/pdf"
                    )
            except:
                st.error("Could not read PDF file")
    elif doc['file_type'].startswith('text/') or doc['file_type'] == 'application/json' or any(file_path.lower().endswith(ext) for ext in ['.txt', '.csv', '.json']):
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            st.code(content)
        except:
            st.error("Could not read file content")
    else:
        st.info("Preview not available for this file type. You can download the file instead.")
    
    # Document actions
    st.subheader("Actions")
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("Download"):
            with open(file_path, "rb") as file:
                st.download_button(
                    label="Download File",
                    data=file,
                    file_name=doc['filename'],
                    mime=doc['file_type']
                )
    
    with col2:
        if st.button("Delete"):
            if delete_document(doc['id'], st.session_state.user_id):
                st.success("Document deleted")
                del st.session_state.selected_document
                navigate_to('documents')
                st.rerun()
    
    st.button("Back to Documents", on_click=navigate_to, args=('documents',))

def render_analytics_page():
    st.title("Analytics")
    
    # Get user stats
    stats = get_user_stats(st.session_state.user_id)
    
    # Document count over time (mock data for now)
    st.subheader("Document Growth")
    
    # Create some mock data for the chart
    dates = pd.date_range(end=pd.Timestamp.now(), periods=30, freq='D')
    counts = np.cumsum(np.random.randint(0, 3, size=30))
    df = pd.DataFrame({'date': dates, 'count': counts})
    
    st.line_chart(df.set_index('date'))
    
    # Document types distribution
    st.subheader("Document Types")
    
    if stats['document_types']:
        # Convert to dataframe for charting
        types_df = pd.DataFrame({
            'type': list(stats['document_types'].keys()),
            'count': list(stats['document_types'].values())
        })
        
        st.bar_chart(types_df.set_index('type'))
    else:
        st.info("No documents found")
    
    # Storage usage
    st.subheader("Storage Usage")
    
    # Mock data for storage growth
    dates = pd.date_range(end=pd.Timestamp.now(), periods=30, freq='D')
    storage = np.cumsum(np.random.randint(0, 1024*1024, size=30))  # Random bytes
    storage_df = pd.DataFrame({'date': dates, 'storage': storage / (1024*1024)})  # Convert to MB
    
    st.line_chart(storage_df.set_index('date'))
    
    # Current usage
    st.metric("Current Storage Used", f"{stats['storage_used'] / (1024*1024):.2f} MB")

def render_teams_page():
    st.title("Teams")
    st.info("Team management functionality will be implemented in a future update")

def render_monitors_page():
    st.title("Document Monitors")
    st.info("Document monitoring functionality will be implemented in a future update")

# Main app logic
def main():
    if not st.session_state.authenticated:
        render_login_page()
    else:
        render_sidebar()
        
        if st.session_state.current_page == 'dashboard':
            render_dashboard()
        elif st.session_state.current_page == 'documents':
            render_documents_page()
        elif st.session_state.current_page == 'search':
            render_search_page()
        elif st.session_state.current_page == 'analytics':
            render_analytics_page()
        elif st.session_state.current_page == 'teams':
            render_teams_page()
        elif st.session_state.current_page == 'monitors':
            render_monitors_page()
        elif st.session_state.current_page == 'document_view':
            render_document_view()

if __name__ == "__main__":
    main()