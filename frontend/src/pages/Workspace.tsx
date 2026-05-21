import React from 'react';

const Workspace: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="w-64 bg-gray-800 p-4 flex flex-col border-r border-gray-700">
        <h2 className="text-xl font-bold mb-4">CollabCode</h2>
        <div className="flex-grow">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Users</h3>
          <ul className="space-y-2">
            <li className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Aryan (You)</li>
          </ul>
        </div>
        <div className="mt-auto">
          <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded">Leave Room</button>
        </div>
      </div>
      <div className="flex-grow flex flex-col">
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between">
          <span>Room: abc-123</span>
          <select className="bg-gray-700 text-white px-2 py-1 rounded">
            <option>JavaScript</option>
            <option>TypeScript</option>
            <option>Python</option>
          </select>
        </div>
        <div className="flex-grow bg-black flex items-center justify-center text-gray-500">
          Editor will be here...
        </div>
      </div>
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-bold">Chat</h3>
        </div>
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="text-sm text-gray-400 italic">Welcome to the chat!</div>
        </div>
        <div className="p-4 border-t border-gray-700">
          <input type="text" placeholder="Type a message..." className="w-full bg-gray-700 text-white p-2 rounded" />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
