=======================================
Worldmap Adaptor Migration to LTI Notes
=======================================

  - Robert Light (light@alum.mit.edu)


These are just some stream-of-thought ideas on how we might migrate (or rewrite) this adapter to work in an LTI-based
environment.  LTI (Learning Tools Interoperability) is both an architecture and an interface for integrating outside
tools into a MOOC environment such as edX, Coursera, Udacity, Blackboard etc.

The interface is described on the IMSGlobal_ website.

.. _IMSGlobal: http://www.imsglobal.org/toolsinteroperability2.cfm

It is likely that we really won't be able to do much with the LTI v1.1 interface - we will need v1.2 or v2.0 inorder
to provide the facility for student answering of questions (I believe 1.2 is a minimum level of functionality).

There are really three elements that need to be ported into an LTI environment:

1. Configuration of the "unit"
2. Managing "state"
3. Managing assessments (reporting grades etc)

The LTI v1.2 interface seems to be sufficient for accomplishing each of these tasks.

The raw embed.html client should be useable for both xBlock as well as LTI integration as it really isn't aware of
the vagaries of the higher level environments - using the xBlockCom-master.js and xBlockCom-slave.js interfaces for
communicating between the cga-worldmap world and the LTI tool server.

In the LTI-worldmap architecture you would have 3 servers interacting to provide a solution to the student's learning experience:

1. The MOOC Server (edX, Coursera, Blackboard etc)
2. The LTI server - handling the generation of display and interactivity surrounding the worldmap frame
3. The CGA-worldmap server - handling the basic operations with worldmap (user-driven geometry drawing, pointing, geometry & layer highlighting as well as standard mapping operations of zoom/pan)

The LTI server layer would interact with the CGA-worldmap layer much the same way as worldmap.py interacts
with the worldmap embed.html via the javascript tools found in xblocktools.js and communicating via the message
passing used in xBlockCom-master/slave.js
The LTI layer would communicate up to the MOOC server via the standard LTI mechanisms for reporting grade values and completion statuses.

The LTI Server would have to be stood up as an independent webserver and would execute all the JTS-based geometric calculations done via Shapely in today's xblock
implementation.  If we use python, we could still use Shapely or we could do the entire worldmap.py functions in
Java and use JTS (Java Topology Services) directly.

I doubt that worldmap.py can be used directly without modification - it would simply be a starting point for development.  All the state management and page generation would have to be custom tailored to the LTI architecture.  The message passing javascript in xBlockCom-master/slave.js should be portable directly to the LTI architecture as should all the functions in xblocktools.js

The main work would be in re-architecting things so that the page gets laid out properly in both the student_view mode as well as the configuration mode.


